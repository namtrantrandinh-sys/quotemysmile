import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  TextInput,
  Keyboard,
  KeyboardAvoidingView,
  StyleSheet,
  Image,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as AppleAuthentication from "expo-apple-authentication";
import { SketchIcon, type SketchIconName } from "@/components/SketchIcon";
import { WaterBanner } from "@/components/WaterBanner";
import { Button } from "@/components/Button";
import { FieldLabel } from "@/components/FieldLabel";
import { TextField } from "@/components/TextField";
import { Wordmark } from "@/components/Wordmark";
import {
  signInWithPhone,
  signInWithEmail,
  signUpWithPhone,
  signUpWithEmail,
  verifyPhoneOtp,
  verifyEmailOtp,
  startLinkEmail,
  startLinkPhone,
  confirmLinkEmail,
  confirmLinkPhone,
  createPatientProfile,
  createDentistProfile,
  signInWithApple,
} from "@/lib/services/auth";
import { supabase } from "@/lib/supabase";

// Editorial smile hero — shared with the welcome screen so the visual
// language is continuous from "/" → "/sign-in" → "/sign-up". Pexels
// 16121509 (laughing blonde, 3513x6000 ~2.8 MB) currently installed.
const HERO_SMILE = require("../assets/images/hero-smile.jpg");

// Patient log-in dedicated hero — hand holding a clear orthodontic
// aligner on a clean off-white backdrop (Pexels 3845985, 3840x5760
// ~620 KB). Patients see this on the sign-in surface; dentists keep
// the smile portrait. Speaks directly to the dental-quote use-case.
const PATIENT_LOGIN_BG = require("../assets/images/patient-login-bg.jpg");

/**
 * App-Review-only bypass. When the reviewer types this email/code, we skip
 * Twilio SMS and route through Supabase's email OTP. Twilio in test mode
 * doesn't deliver to non-AU numbers, which would otherwise block submission.
 * Set the matching test user up in Supabase Auth with `email_otp` enabled.
 */
const REVIEW_EMAIL = "review@quotemysmile.com.au";
const REVIEW_CODE_HINT =
  "Tip: while SMS is being configured, you can sign in with your email address — we'll send the code there instead.";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Any properly-formatted email triggers the Supabase email-OTP path.
// During Twilio rollout this is the fallback for everyone, not just Apple
// Review. The user types their email in the same field and gets a code
// in their inbox within seconds.
function looksLikeEmail(value: string) {
  return EMAIL_RE.test(value.trim().toLowerCase());
}

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: "patient" | "dentist"; mode?: "signin" | "signup" }>();

  // Role can come in as a deep-link param (from the welcome screen's
  // "I'm a dentist →" link, etc). When it does we skip the role picker
  // and go straight to the matching sign-in form.
  const [pickedRole, setPickedRole] = useState<"patient" | "dentist" | null>(
    params.role === "dentist" ? "dentist" : params.role === "patient" ? "patient" : null,
  );
  const role = pickedRole ?? "patient";
  const mode = params.mode === "signin" ? "signin" : "signup";

  // Sign-up flow phases:
  //   phone  → enter primary identifier (mobile or email)
  //   otp    → verify primary
  //   profile→ enter name + the OTHER identifier (so both bind to one auth user)
  //   linkOtp→ verify the second identifier
  // Sign-in flow phases:
  //   phone  → enter mobile or email
  //   otp    → verify, route to home
  const [phase, setPhase] = useState<"phone" | "otp" | "profile" | "linkOtp">("phone");
  // Method tab — defaults to EMAIL while QMS's Supabase Auth project
  // doesn't have an SMS provider wired up (per the QMS↔LORDLY infra
  // isolation rule we can't reuse LORDLY's Twilio account, so QMS phone
  // OTP currently fails at the provider layer). Email OTP is proven
  // through the QMS Resend sender. User can still tap Mobile but the
  // inline notice below tells them it's offline.
  const [method, setMethod] = useState<"phone" | "email">("email");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  // Secondary identifier captured at the profile phase — the OTHER one
  // (email if the user signed up with phone, phone if they signed up
  // with email). Stored as the normalised value we send to Supabase.
  const [secondary, setSecondary] = useState("");
  const [secondaryCode, setSecondaryCode] = useState("");
  const [busy, setBusy] = useState(false);
  // Resend-code cooldown — Supabase rate-limits to ~once per 60s; we
  // surface a visible countdown so the user isn't stuck wondering.
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Treat as email if the user explicitly picked Email tab, OR if they
  // typed/pasted something that looks like an email into the field.
  const isEmail = method === "email" || looksLikeEmail(phone);

  // Normalise to E.164: digits only, prefixed with "+". Australian users
  // commonly type "0412…" or "+61 412 345 678" — both need to become
  // "+61412345678" before Supabase/Twilio will accept it.
  const normalisePhone = (raw: string): string => {
    const digits = raw.replace(/\D/g, "");
    if (raw.trim().startsWith("+")) return "+" + digits;
    // Bare AU mobile like "0412345678" → drop leading 0, prepend +61.
    if (digits.startsWith("0") && digits.length === 10) return "+61" + digits.slice(1);
    // Already starts with country code 61 but no +.
    if (digits.startsWith("61") && digits.length >= 11) return "+" + digits;
    return "+" + digits;
  };

  const send = async () => {
    setBusy(true);
    try {
      // SIGN-IN: never create a new auth user (shouldCreateUser:false in
      // signInWith{Phone,Email}). If Supabase returns "Signups not allowed
      // for otp" we know the identifier isn't on any auth row and offer to
      // switch to signup. SIGN-UP: signUpWith{Phone,Email} explicitly
      // creates the row.
      if (isEmail) {
        const e = phone.trim().toLowerCase();
        if (mode === "signin") {
          await signInWithEmail(e);
        } else {
          await signUpWithEmail(e);
        }
        setPhone(e);
        setPhase("otp");
        setResendIn(60);
        return;
      }
      const e164 = normalisePhone(phone);
      if (e164.replace(/\D/g, "").length < 10) {
        Alert.alert(
          "Check your number",
          "Enter your full mobile (e.g. 0412 345 678) or your email address.",
        );
        return;
      }
      setPhone(e164);
      if (mode === "signin") {
        await signInWithPhone(e164);
      } else {
        await signUpWithPhone(e164);
      }
      setPhase("otp");
      setResendIn(60);
    } catch (e) {
      // Surface the full error to console so we can see the actual
      // Supabase code/body when the user reports "couldn't send code".
      // Without this, all 401/500/SMTP errors collapse into a single
      // generic alert and we lose the diagnostic signal.
      console.error("[QMS] OTP send failed:", e);
      const msg = e instanceof Error ? e.message : "Try again.";
      const noSignup = /signups not allowed|user not found|not.*registered/i.test(msg);
      if (mode === "signin" && noSignup) {
        Alert.alert(
          isEmail ? "No account on this email" : "No account on this number",
          "We couldn't find a QuoteMySmile account here. Create one now?",
          [
            { text: "Try another", style: "cancel" },
            {
              text: "Create account",
              onPress: () =>
                router.replace({
                  pathname: "/sign-in",
                  params: { role, mode: "signup" },
                }),
            },
          ],
        );
        return;
      }
      const looksLikeTwilioBlocked =
        /unsupported|invalid.*phone|sms not configured|provider/i.test(msg);
      // A user trying to SIGN UP with an identifier already bound to a
      // different role (most often a dentist signing up as a patient
      // with the same email) lands here. Steer them to Sign In so they
      // can land on the patient flow without creating a new account.
      const alreadyRegistered =
        mode === "signup" && /already.*registered|already.*exists/i.test(msg);
      if (alreadyRegistered) {
        Alert.alert(
          "Already on QuoteMySmile",
          `This ${isEmail ? "email" : "number"} is already on an account. Sign in instead — you can use the patient flow whichever role your account was set up with.`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign in",
              onPress: () =>
                router.replace({
                  pathname: "/sign-in",
                  params: { role, mode: "signin" },
                }),
            },
          ],
        );
        return;
      }
      // Detect the common Supabase-config root causes and steer the
      // user toward the path that's actually wired. The QMS Supabase
      // project (mqlaoxcjebzsihiocmzm) currently relies on Resend for
      // email OTP; phone OTP isn't wired yet (Twilio isolation rule).
      // When email send itself fails it's almost always the SMTP
      // template — surface a clearer hint rather than the raw error.
      const looksLikeSmtpBroken =
        isEmail &&
        /smtp|email rate|error sending|email otp|confirmation email|rate limit/i.test(
          msg,
        );
      const looksLikeAuthDisabled = /signups? (are )?disabled|signup disabled/i.test(
        msg,
      );
      const title = looksLikeAuthDisabled
        ? "Sign-ups are paused"
        : looksLikeSmtpBroken
          ? "Email isn't sending"
          : looksLikeTwilioBlocked
            ? "Mobile codes aren't ready yet"
            : "Couldn't send code";
      const body = looksLikeAuthDisabled
        ? "QuoteMySmile sign-ups are temporarily paused. Try again shortly."
        : looksLikeSmtpBroken
          ? `Our mailer is busy or not yet wired for this address. (${msg})\n\nIf you keep seeing this, message support — we'll send your code by hand.`
          : looksLikeTwilioBlocked
            ? `${msg}\n\nMobile OTP isn't connected for QMS yet. Use your email address — we'll send the code to your inbox.`
            : msg;
      Alert.alert(title, body);
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      if (isEmail) {
        await verifyEmailOtp(phone.trim().toLowerCase(), code);
      } else {
        await verifyPhoneOtp(phone, code);
      }
      // Dual-role lookup: the role the user PICKED on the role tile
      // decides which profile table we consult. The OTHER profile's
      // existence is irrelevant — a dentist signing in via the
      // PATIENT button lands on the patient portal, even if they also
      // hold a dentist profile. No crossover, ever.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No session after verify");

      const profileTable =
        role === "dentist" ? "dentist_profiles" : "patient_profiles";
      // Brief retry — RLS or post-OTP session settle can race the row.
      let hasProfile = false;
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from(profileTable)
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          hasProfile = true;
          break;
        }
        if (i < 2) await new Promise((r) => setTimeout(r, 600));
      }

      if (hasProfile) {
        // Picked role's profile exists — straight to that portal.
        router.replace(role === "dentist" ? "/dentist" : "/");
        return;
      }

      // No profile of the picked role. Two paths:
      //   • Dentist button → /dentist/onboarding collects AHPRA + clinic
      //     and writes the dentist_profiles row at the end.
      //   • Patient button → in-screen profile phase captures name
      //     (and links the second identifier if not yet bound), then
      //     writes patient_profiles.
      if (role === "dentist") {
        router.replace("/dentist/onboarding");
        return;
      }
      setPhase("profile");
    } catch (e) {
      Alert.alert("Code didn't match", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  /**
   * Apple 4.8 — Sign In with Apple. Routes to the same post-verify
   * profile-lookup branch as the OTP flow so dentist/patient routing
   * works identically. iOS-only; the button is hidden on Android.
   */
  const handleAppleSignIn = async () => {
    setBusy(true);
    try {
      const { user } = await signInWithApple();
      if (!user) throw new Error("No session after Apple sign-in");
      const profileTable =
        role === "dentist" ? "dentist_profiles" : "patient_profiles";
      let hasProfile = false;
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from(profileTable)
          .select("user_id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (data) {
          hasProfile = true;
          break;
        }
        if (i < 2) await new Promise((r) => setTimeout(r, 500));
      }
      if (hasProfile) {
        router.replace(role === "dentist" ? "/dentist" : "/");
        return;
      }
      if (role === "dentist") {
        router.replace("/dentist/onboarding");
        return;
      }
      // Patient first-time Apple sign-in. We still need name capture
      // (Apple may hide email; profile screen also captures phone).
      setPhase("profile");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // User cancelled Apple sheet — silent, don't alert.
      if (/canceled|cancelled|ERR_REQUEST_CANCELED|1001/i.test(msg)) return;
      // Common cause: Supabase Auth Apple provider not yet configured
      // for the QMS project. Surface a more helpful nudge so the user
      // can fall back to email OTP while infra is being completed.
      const providerNotConfigured =
        /provider is not enabled|provider not found|missing identity provider|provider .* not enabled/i.test(
          msg,
        );
      Alert.alert(
        providerNotConfigured
          ? "Apple sign-in not ready yet"
          : "Apple sign-in failed",
        providerNotConfigured
          ? "Sign in with Apple is being configured for QuoteMySmile. Please use the email or mobile option above for now."
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  const resendCode = async () => {
    if (resendIn > 0 || busy) return;
    setBusy(true);
    try {
      if (isEmail) {
        await signInWithEmail(phone.trim().toLowerCase());
      } else {
        await signInWithPhone(phone);
      }
      setResendIn(60);
    } catch (e) {
      Alert.alert("Couldn't resend", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  // What kind of identifier we still need to bind. If the user signed up
  // with phone, we need their email next, and vice versa.
  const linkType: "phone" | "email" = isEmail ? "phone" : "email";

  const completeProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Your name", "We need your name to introduce you to dentists.");
      return;
    }
    setBusy(true);
    try {
      // Dual-role short-circuit: if this auth user ALREADY has both
      // phone and email bound (because they previously created the
      // OTHER role's profile and went through the link step then), we
      // skip the second-identifier prompt entirely and just write the
      // patient_profiles row. No second OTP needed.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email && user?.phone) {
        await createPatientProfile({
          fullName: name.trim(),
          phone: user.phone ?? undefined,
          email: user.email ?? undefined,
        });
        router.replace("/");
        return;
      }

      // First-profile creation flow — capture + link the OTHER identifier.
      const rawSecondary = secondary.trim();
      if (linkType === "email") {
        if (!EMAIL_RE.test(rawSecondary.toLowerCase())) {
          Alert.alert("Add your email", "Enter the email address you'll use to sign in.");
          return;
        }
      } else {
        const e164 = normalisePhone(rawSecondary);
        if (e164.replace(/\D/g, "").length < 10) {
          Alert.alert("Add your mobile", "Enter a valid AU mobile (e.g. 0412 345 678).");
          return;
        }
      }
      // Kick off the identity-link: Supabase sends an OTP to the new
      // identifier. We advance to linkOtp and the user enters it there.
      if (linkType === "email") {
        const e = rawSecondary.toLowerCase();
        await startLinkEmail(e);
        setSecondary(e);
      } else {
        const e164 = normalisePhone(rawSecondary);
        await startLinkPhone(e164);
        setSecondary(e164);
      }
      setSecondaryCode("");
      setPhase("linkOtp");
      setResendIn(60);
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ??
        (typeof e === "string" ? e : "Try again.");
      // Most likely cause: the secondary identifier is already bound to a
      // DIFFERENT auth user. Surface a clear "use the other method" path.
      const conflict = /already.*registered|already.*exists|duplicate/i.test(msg);
      Alert.alert(
        conflict ? "Already on another account" : "Couldn't link that",
        conflict
          ? `This ${linkType} is already used by another QuoteMySmile account. Sign in with it instead.`
          : msg,
      );
    } finally {
      setBusy(false);
    }
  };

  // Escape hatch for when SMS isn't deliverable (Twilio off, provider
  // outage, user without a mobile right now). Skips the second-identifier
  // OTP entirely and creates the patient profile with whatever single
  // identifier the auth user already has (email-only is fine — the
  // patient_profiles row only requires user_id + full_name). Patient-side
  // only: dentists still need phone for AHPRA / clinic comms, so they
  // continue to use the SMS path on /dentist/onboarding.
  const skipSecondaryAndFinish = async () => {
    if (!name.trim()) {
      Alert.alert("Your name", "We need your name to introduce you to dentists.");
      return;
    }
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      await createPatientProfile({
        fullName: name.trim(),
        phone: user?.phone ?? undefined,
        email: user?.email ?? undefined,
      });
      router.replace("/");
    } catch (e) {
      Alert.alert(
        "Couldn't save profile",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  const verifyLinkOtp = async () => {
    if (!secondaryCode.trim()) {
      Alert.alert("Enter the code", "Check the code we just sent.");
      return;
    }
    setBusy(true);
    try {
      if (linkType === "email") {
        await confirmLinkEmail(secondary, secondaryCode.trim());
      } else {
        await confirmLinkPhone(secondary, secondaryCode.trim());
      }
      // Both identifiers are now bound to one auth.users row. Write the
      // PATIENT profile (dentists go through /dentist/onboarding for
      // AHPRA + clinic capture). Same identity may also hold a
      // dentist_profile later — that's fine, the rows are independent.
      await createPatientProfile({
        fullName: name.trim(),
        phone: linkType === "phone" ? secondary : phone,
        email: linkType === "email" ? secondary : phone,
      });
      router.replace("/");
    } catch (e) {
      const msg =
        (e as { message?: string })?.message ??
        (typeof e === "string" ? e : "Try again.");
      Alert.alert("Code didn't match", msg);
    } finally {
      setBusy(false);
    }
  };

  const resendLinkCode = async () => {
    if (resendIn > 0 || busy) return;
    setBusy(true);
    try {
      if (linkType === "email") await startLinkEmail(secondary);
      else await startLinkPhone(secondary);
      setResendIn(60);
    } catch (e) {
      Alert.alert("Couldn't resend", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  // Visual register branches on role. Patients get warm consumer (water
  // banner, mint accent, friendly copy). Dentists get an authoritative
  // practitioner treatment (deep teal header, lock glyph, AHPRA reference).
  const isDentist = role === "dentist";

  // Patient entry hero — minimalist mint full-bleed. Replaces the
  // previous role-picker + WaterBanner stack for the default patient
  // path. White wordmark, italic tagline "Your dream smile, in your
  // hand.", single identifier field, white pill CTA. SIWA stays
  // (Apple resubmit requirement, build 27). "I'm a dentist" link at
  // foot routes to the dentist flow. The dentist path and all OTP /
  // profile / link phases continue to use the existing UI below.
  if (phase === "phone") {
    const submitDisabled = busy || phone.trim().length < 3;
    const handleSubmit = () => {
      Keyboard.dismiss();
      if (!submitDisabled) send();
    };
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0A0A" }}>
        {/* Full-bleed smile photo — same Image pattern as the welcome
            screen (app/index.tsx) so the visual hand-off from "/" to
            "/sign-in" is seamless. Absolute-positioned 100%×100% with
            cover so the smile crops identically across both screens. */}
        <Image
          source={HERO_SMILE}
          resizeMode="cover"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100%",
            height: "100%",
          }}
        />
        {/* Bottom-anchored dark scrim — matches the welcome screen.
            Keeps the smile + teeth bright at the top of the viewport
            while darkening the lower half so the form and white wordmark
            stay legible. */}
        <LinearGradient
          colors={[
            "rgba(0,0,0,0.10)",
            "rgba(0,0,0,0.05)",
            "rgba(20,40,38,0.45)",
            "rgba(20,40,38,0.82)",
          ]}
          locations={[0, 0.35, 0.65, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  flex: 1,
                  paddingHorizontal: 32,
                  paddingTop: 72,
                  paddingBottom: 24,
                  justifyContent: "space-between",
                }}
              >
                {/* Hero — white wordmark + italic tagline */}
                <View style={{ alignItems: "center", gap: 28 }}>
                  <Wordmark size="lg" tone="light" />
                  <Text
                    style={{
                      fontFamily: "Allura",
                      fontSize: 44,
                      lineHeight: 52,
                      color: "rgba(255,255,255,0.96)",
                      textAlign: "center",
                      letterSpacing: 0.3,
                      textShadowColor: "rgba(255,255,255,0.25)",
                      textShadowOffset: { width: 0, height: 0 },
                      textShadowRadius: 12,
                    }}
                  >
                    Dentists compete{"\n"}for your quote.
                  </Text>
                </View>

                {/* Form — single underlined input + white pill button */}
                <View style={{ gap: 18 }}>
                  {/* Role pill — always visible at the top of the form
                      so the user can see / switch between Patient and
                      Dentist sign-in. Replaces the easily-missed footer
                      link that was clipping off small viewports. */}
                  <View
                    style={{
                      flexDirection: "row",
                      backgroundColor: "rgba(255,255,255,0.18)",
                      borderRadius: 999,
                      padding: 4,
                      alignSelf: "center",
                    }}
                  >
                    {(["patient", "dentist"] as const).map((r) => {
                      const active = (isDentist ? "dentist" : "patient") === r;
                      return (
                        <Pressable
                          key={r}
                          onPress={() => {
                            if (active) return;
                            setPickedRole(r);
                            setPhone("");
                          }}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 22,
                            borderRadius: 999,
                            backgroundColor: active
                              ? "#FFFFFF"
                              : "transparent",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter",
                              fontSize: 12,
                              letterSpacing: 1.6,
                              fontWeight: "700",
                              textTransform: "uppercase",
                              color: active ? "#1F4F47" : "#FFFFFF",
                            }}
                          >
                            {r === "patient" ? "Patient" : "Dentist"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <View>
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 10,
                        letterSpacing: 2.4,
                        color: "rgba(255,255,255,0.7)",
                        textTransform: "uppercase",
                        fontWeight: "500",
                        marginBottom: 8,
                      }}
                    >
                      {mode === "signin" ? "Sign in" : "Sign up"}
                    </Text>
                    <TextInput
                      value={phone}
                      onChangeText={setPhone}
                      onSubmitEditing={handleSubmit}
                      placeholder="Mobile or email"
                      placeholderTextColor="rgba(255,255,255,0.55)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="go"
                      selectionColor="#FFFFFF"
                      style={{
                        fontFamily: "Inter",
                        fontSize: 17,
                        color: "#FFFFFF",
                        paddingVertical: 10,
                        borderBottomWidth: 1,
                        borderBottomColor: "rgba(255,255,255,0.55)",
                      }}
                    />
                  </View>

                  {/* White pill CTA — canonical Pressable pattern:
                      outer View owns visuals (bg, radius, shadow),
                      Pressable owns opacity only, inner View owns
                      layout. Avoids the iOS layout-drop bug. */}
                  <View
                    style={{
                      borderRadius: 999,
                      overflow: "hidden",
                      backgroundColor: "#FFFFFF",
                      shadowColor: "#FFFFFF",
                      shadowOpacity: 0.45,
                      shadowRadius: 16,
                      shadowOffset: { width: 0, height: 0 },
                      elevation: 4,
                      opacity: submitDisabled ? 0.6 : 1,
                      marginTop: 8,
                    }}
                  >
                    <Pressable
                      onPress={handleSubmit}
                      disabled={submitDisabled}
                      style={({ pressed }) => ({
                        opacity: pressed && !submitDisabled ? 0.85 : 1,
                      })}
                    >
                      <View
                        style={{
                          paddingVertical: 18,
                          paddingHorizontal: 24,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: "Inter",
                            fontWeight: "700",
                            fontSize: 12,
                            letterSpacing: 2.6,
                            color: "#1F4F47",
                            textTransform: "uppercase",
                          }}
                        >
                          {busy
                            ? "Sending…"
                            : mode === "signin"
                              ? "Sign in"
                              : "Sign up"}
                        </Text>
                      </View>
                    </Pressable>
                  </View>

                  {/* Apple SIWA — required for Apple App Review (build 27
                      resubmit). Reuses the canonical handleAppleSignIn
                      handler so post-Apple routing (patient vs dentist
                      profile lookup, onboarding redirect, provider-not-
                      configured messaging) is identical to the old
                      flow. iOS only. */}
                  {Platform.OS === "ios" ? (
                    <View style={{ marginTop: 4 }}>
                      <AppleAuthentication.AppleAuthenticationButton
                        buttonType={
                          mode === "signin"
                            ? AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                            : AppleAuthentication.AppleAuthenticationButtonType.SIGN_UP
                        }
                        buttonStyle={
                          AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
                        }
                        cornerRadius={999}
                        style={{ width: "100%", height: 52 }}
                        onPress={handleAppleSignIn}
                      />
                    </View>
                  ) : null}

                  {/* Sign-in ↔ Sign-up switcher */}
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "center",
                      marginTop: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 13,
                        color: "rgba(255,255,255,0.75)",
                      }}
                    >
                      {mode === "signin"
                        ? "New to QuoteMySmile? "
                        : "Have an account? "}
                    </Text>
                    <Pressable
                      onPress={() =>
                        router.replace({
                          pathname: "/sign-in",
                          params: {
                            role: isDentist ? "dentist" : "patient",
                            mode: mode === "signin" ? "signup" : "signin",
                          },
                        })
                      }
                      hitSlop={8}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontSize: 13,
                          color: "#FFFFFF",
                          fontWeight: "600",
                          textDecorationLine: "underline",
                        }}
                      >
                        {mode === "signin" ? "Create account" : "Sign in"}
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {/* Spacer — keeps the form sized like before now that
                    the role pill lives at the top of the form section
                    instead of as a separate footer link. */}
                <View />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    );
  }

  // Role picker — shown when no role has been deep-linked in. Lets the
  // user choose Patient vs Dentist from a single sign-in landing.
  if (!pickedRole) {
    return (
      <View className="flex-1 bg-bone">
        <WaterBanner />
        <ScrollView>
          <View className="px-8 pt-12 pb-8 items-center">
            <Wordmark size="md" />
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 10,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                color: "#8A7E70",
                marginTop: 36,
                marginBottom: 18,
                fontWeight: "500",
              }}
            >
              Sign in to QuoteMySmile
            </Text>
            <Text
              style={{
                fontFamily: "CormorantGaramond_400Regular",
                fontSize: 42,
                lineHeight: 46,
                color: "#2A2520",
                textAlign: "center",
                marginBottom: 14,
                letterSpacing: -0.5,
              }}
            >
              Who's signing in?
            </Text>
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 14,
                lineHeight: 22,
                color: "#6E6457",
                textAlign: "center",
                maxWidth: 360,
                marginBottom: 36,
              }}
            >
              We tailor the next steps to whether you're booking dental work or providing it.
            </Text>
          </View>

          <View
            className="px-6 pb-12"
            style={{ flexDirection: "row", gap: 10 }}
          >
            <RoleSignInButton
              role="patient"
              title="I'm a Patient"
              icon="smile"
              onPress={() => setPickedRole("patient")}
            />
            <RoleSignInButton
              role="dentist"
              title="I'm a Dentist"
              icon="tooth"
              onPress={() => setPickedRole("dentist")}
            />
          </View>

          <View className="items-center pb-16 px-8">
            <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans text-center">
              All quotes are AHPRA-signed · A$5 platform fee per attended booking
            </Text>
            <View style={{ flexDirection: "row", gap: 14, marginTop: 14 }}>
              <Pressable onPress={() => router.push("/legal/privacy")} hitSlop={10}>
                <Text className="text-[10px] tracking-cap uppercase text-gold font-sans">
                  Privacy policy
                </Text>
              </Pressable>
              <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">·</Text>
              <Pressable onPress={() => router.push("/legal/terms")} hitSlop={10}>
                <Text className="text-[10px] tracking-cap uppercase text-gold font-sans">
                  Terms of service
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-bone">
      {isDentist ? <DentistHeader /> : <SignInBanner />}
      {/* Back button — ALWAYS visible.
          • In the OTP phase, go back to phone entry.
          • Otherwise, return to the role picker if the user picked
            in-app, else router.back() to the welcome screen. */}
      <Pressable
        onPress={() => {
          if (phase === "otp") {
            setPhase("phone");
            setCode("");
            return;
          }
          if (phase === "profile") {
            setPhase("otp");
            return;
          }
          if (phase === "linkOtp") {
            setPhase("profile");
            setSecondaryCode("");
            return;
          }
          // In phone phase. If the user picked a role inside this
          // screen, take them back to the picker. Otherwise leave the
          // sign-in screen entirely and return to welcome.
          if (!params.role) {
            setPickedRole(null);
            setPhone("");
            setCode("");
            return;
          }
          // Always route via replace("/") — router.back() throws
          // "GO_BACK not handled" when there is no history (which
          // happens on direct deep-links and cold launches into the
          // sign-in screen).
          router.replace("/");
        }}
        hitSlop={12}
        style={{
          position: "absolute",
          top: 54,
          left: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDentist
            ? "rgba(255,255,255,0.12)"
            : "#FFFFFF",
          borderWidth: isDentist ? 1 : 1,
          borderColor: isDentist ? "rgba(255,255,255,0.25)" : "#E5DCC8",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          shadowColor: "#2E7268",
          shadowOpacity: isDentist ? 0 : 0.10,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <SketchIcon
          name="chevron-left"
          size={20}
          color={isDentist ? "#FFFFFF" : "#2A2520"}
          strokeWidth={1.6}
          noGhost
        />
      </Pressable>
      <ScrollView>
        <View className="px-8 pt-10 pb-8 items-center">
          <Wordmark size="md" />
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 10,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              color: isDentist ? "#2E7268" : "#8A7E70",
              marginTop: 36,
              marginBottom: 18,
              fontWeight: "500",
            }}
          >
            {phase === "otp"
              ? "Verify"
              : phase === "linkOtp"
                ? linkType === "email"
                  ? "Confirm email"
                  : "Confirm mobile"
                : isDentist
                  ? "AHPRA on file"
                  : "Almost there"}
          </Text>
          <Text
            style={{
              fontFamily: "CormorantGaramond_400Regular",
              fontSize: 42,
              lineHeight: 46,
              color: "#2A2520",
              textAlign: "center",
              marginBottom: 16,
              letterSpacing: -0.5,
            }}
          >
            {phase === "otp"
              ? "Enter the code."
              : phase === "linkOtp"
                ? "One more code."
                : isDentist
                  ? "Your registered name."
                  : "What's your name?"}
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            {phase === "otp"
              ? `Sent to ${phone}. The code expires in 5 minutes.`
              : phase === "linkOtp"
                ? `Sent to ${secondary}. We'll bind it to this account so you can sign in with either.`
                : isDentist
                  ? "Use the name on your AHPRA registration, then add your email so you can sign in with either."
                  : "We'll use your name to introduce you to the dentist. Add your email so you can sign in with either."}
          </Text>
        </View>

        <View className="px-8 pb-24">
          {phase === "otp" ? (
            <>
              <FieldLabel label="Sign-in code">
                <TextField
                  value={code}
                  onChangeText={setCode}
                  placeholder="12345678"
                  keyboardType="numeric"
                  maxLength={8}
                  autoFocus
                />
              </FieldLabel>
              <View className="gap-3 mt-6 items-center">
                <Button variant="primary" size="lg" onPress={verify}>
                  {busy ? "Verifying…" : "Verify"}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={resendCode}
                >
                  {resendIn > 0
                    ? `Resend code in ${resendIn}s`
                    : busy
                      ? "Sending…"
                      : "Resend code"}
                </Button>
                <Button variant="ghost" size="md" onPress={() => setPhase("phone")}>
                  Change number
                </Button>
              </View>
            </>
          ) : phase === "profile" ? (
            <>
              <FieldLabel
                label="Full name"
                hint={
                  isDentist
                    ? "As registered with AHPRA. Patients see this on every quote."
                    : "As you'd like the dentist to address you."
                }
              >
                <TextField
                  value={name}
                  onChangeText={setName}
                  placeholder={isDentist ? "Dr Sarah Chen" : "Sarah K"}
                />
              </FieldLabel>
              {/* Second identifier — we bind both phone and email to a
                  SINGLE auth.users row so the user can later sign in with
                  whichever they prefer and always land on the same profile. */}
              <View style={{ marginTop: 18 }}>
                <FieldLabel
                  label={linkType === "email" ? "Email address" : "Mobile number"}
                  hint={
                    linkType === "email"
                      ? "We'll send a code to confirm it. You can sign in with either method later."
                      : "We'll send an SMS to confirm it. You can sign in with either method later."
                  }
                >
                  <TextField
                    value={secondary}
                    onChangeText={setSecondary}
                    placeholder={
                      linkType === "email" ? "you@email.com" : "0412 345 678"
                    }
                    keyboardType={
                      linkType === "email" ? "email-address" : "phone-pad"
                    }
                  />
                </FieldLabel>
              </View>
              <View className="items-center mt-6 gap-3">
                <Button variant="primary" size="lg" onPress={completeProfile}>
                  {busy
                    ? "Sending code…"
                    : linkType === "email"
                      ? "Send email code"
                      : "Send SMS code"}
                </Button>
                {/* Skip-link escape — patient + phone-link only. Lets
                    new users finish signup with email alone when SMS is
                    unavailable (Twilio off, dev project, outage). They
                    can add their phone later from settings. Dentists are
                    excluded because /dentist/onboarding still requires
                    phone for AHPRA contact + booking SMS. */}
                {linkType === "phone" && role === "patient" ? (
                  <Button
                    variant="ghost"
                    size="md"
                    onPress={skipSecondaryAndFinish}
                    disabled={busy}
                  >
                    Skip — I'll add my phone later
                  </Button>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <FieldLabel label={linkType === "email" ? "Email code" : "SMS code"}>
                <TextField
                  value={secondaryCode}
                  onChangeText={setSecondaryCode}
                  placeholder="123456"
                  keyboardType="numeric"
                  maxLength={8}
                  autoFocus
                />
              </FieldLabel>
              <View className="items-center gap-3 mt-6">
                <Button variant="primary" size="lg" onPress={verifyLinkOtp}>
                  {busy
                    ? "Confirming…"
                    : isDentist
                      ? "Confirm & continue to AHPRA"
                      : "Confirm & finish"}
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onPress={resendLinkCode}
                >
                  {resendIn > 0
                    ? `Resend in ${resendIn}s`
                    : busy
                      ? "Sending…"
                      : "Resend code"}
                </Button>
                <Button variant="ghost" size="md" onPress={() => setPhase("profile")}>
                  {linkType === "email" ? "Change email" : "Change number"}
                </Button>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * RoleSignInButton — large tappable card. Patient = mint primary; Dentist
 * = deep-teal authoritative. Both pill-shaped to match the rest of the
 * button system. Used on the sign-in landing's role-picker step.
 */
function RoleSignInButton({
  role,
  title,
  icon,
  onPress,
}: {
  role: "patient" | "dentist";
  title: string;
  icon: SketchIconName;
  onPress: () => void;
}) {
  // Tend Dental tactile card: white surface, warm hairline border,
  // soft mint/teal accent disc on the left, editorial serif title and
  // sentence-case Inter subtitle, mint arrow on the right. Reads as
  // editorial healthcare brand rather than marketing pill.
  // Background sits on the wrapper View to dodge the iOS bug where
  // Pressable function-styles intermittently drop backgroundColor.
  const isDentist = role === "dentist";
  const accent = isDentist ? "#2E7268" : "#5FA89B";
  const accentSoft = isDentist
    ? "rgba(31,79,71,0.10)"
    : "rgba(95,168,155,0.14)";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(31,79,71,0.10)",
        shadowColor: "#2E7268",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={onPress}
        android_ripple={{ color: "rgba(31,79,71,0.06)" }}
        style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
      >
        <View
          style={{
            paddingVertical: 14,
            paddingHorizontal: 10,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: accentSoft,
              borderWidth: 1,
              borderColor: isDentist
                ? "rgba(31,79,71,0.18)"
                : "rgba(95,168,155,0.30)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SketchIcon name={icon} size={22} color={accent} strokeWidth={1.5} />
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: 13,
              lineHeight: 17,
              color: "#2A2520",
              letterSpacing: 0.1,
              textAlign: "center",
              includeFontPadding: false,
            }}
          >
            {title}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

/**
 * SignInBanner — mint + white treatment. A soft mint band at the top
 * fades into cream, with a thin gold rule. Much cleaner + more modern
 * than the full ocean WaterBanner — keeps mint as an accent rather
 * than dominating the entire screen.
 */
function SignInBanner() {
  return (
    <View
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#F5F1E8",
      }}
    >
      <LinearGradient
        colors={["#A8DCCB", "#C8E8DC", "#E8F2EB", "#F5F1E8"]}
        locations={[0, 0.4, 0.78, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Hairline mint rule that emphasises the fade */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: 0,
          left: 24,
          right: 24,
          height: 1,
          backgroundColor: "rgba(95,168,155,0.18)",
        }}
      />
      <SafeAreaView edges={["top"]}>
        <View style={{ height: 32 }} />
      </SafeAreaView>
    </View>
  );
}

/**
 * DentistHeader — quieter, professional alternative to the WaterBanner.
 * Solid deep-teal gradient with a thin gold rule, a shield-check icon
 * and the "Practitioner portal" caption. Reads as authoritative rather
 * than consumer-feminine, while still living in the QMS palette.
 */
function DentistHeader() {
  return (
    <View
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#2E7268",
      }}
    >
      <LinearGradient
        colors={["#2E7268", "#2D6E66", "#2E7268"]}
        locations={[0, 0.55, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Subtle horizontal rule under the caption — small editorial tell */}
      <SafeAreaView edges={["top"]}>
        <View
          style={{
            paddingHorizontal: 22,
            paddingTop: 14,
            paddingBottom: 28,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <SketchIcon name="verified" size={16} color="#A8DCCB" strokeWidth={1.5} noGhost />
            <Text
              style={{
                fontFamily: "Inter-Medium",
                fontSize: 10,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                color: "#A8DCCB",
              }}
            >
              Practitioner portal
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "Caveat",
              fontSize: 16,
              color: "rgba(255,255,255,0.85)",
            }}
          >
            AHPRA-verified
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
