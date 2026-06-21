import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
  createUserProfile,
} from "@/lib/services/auth";
import { supabase } from "@/lib/supabase";

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
  // Method tab — defaults to phone, user can switch to email so the
  // keyboard is correct from the very first keystroke. Auto-flips to
  // email if they paste an address into the phone field.
  const [method, setMethod] = useState<"phone" | "email">("phone");
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
      Alert.alert(
        "Couldn't send code",
        looksLikeTwilioBlocked
          ? `${msg}\n\nTry your email address instead — we'll send the code to your inbox.`
          : msg,
      );
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
      // Check if profile exists. RLS trigger may not have completed the
      // upsert yet, so retry briefly before sending the user to the
      // role-completion screen (avoids prompting twice on a slow network).
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No session after verify");
      let profile: { id: string; role: string; full_name: string | null } | null =
        null;
      for (let i = 0; i < 3; i++) {
        const { data } = await supabase
          .from("users")
          .select("id, role, full_name")
          .eq("id", user.id)
          .maybeSingle();
        if (data) {
          profile = data;
          break;
        }
        if (i < 2) await new Promise((r) => setTimeout(r, 600));
      }
      if (!profile) {
        // Reachable in two cases:
        //   (a) SIGN-UP: first-time OTP just succeeded — go collect the
        //       second identifier + name so both bind to this auth user.
        //   (b) SIGN-IN: auth.users row exists (Supabase let us through)
        //       but no public.users row yet — happens when a previous
        //       signup was abandoned mid-profile. Resume by sending them
        //       through the same profile + link flow.
        setPhase("profile");
      } else {
        router.replace(profile.role === "dentist" ? "/dentist" : "/");
      }
    } catch (e) {
      Alert.alert("Code didn't match", e instanceof Error ? e.message : "Try again.");
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
    // Capture + validate the SECOND identifier. Both phone and email must
    // bind to the same auth.users row before we write public.users, so a
    // future sign-in with EITHER one resolves to the same account.
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
    setBusy(true);
    try {
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
      // public.users row with BOTH so unique constraints catch any future
      // collision and either sign-in method finds the same profile.
      await createUserProfile({
        role,
        fullName: name.trim(),
        phone: linkType === "phone" ? secondary : phone,
        email: linkType === "email" ? secondary : phone,
      });
      router.replace(role === "dentist" ? "/dentist/onboarding" : "/");
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

          <View className="px-6 pb-12" style={{ gap: 12 }}>
            <RoleSignInButton
              role="patient"
              title="I'm a Patient"
              subtitle="Get AHPRA-signed quotes near you"
              icon="account-heart-outline"
              onPress={() => setPickedRole("patient")}
            />
            <RoleSignInButton
              role="dentist"
              title="I'm a Dentist"
              subtitle="AHPRA practitioner · paid per attendance"
              icon="tooth-outline"
              onPress={() => setPickedRole("dentist")}
            />
          </View>

          <View className="items-center pb-16">
            <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans text-center">
              All quotes are AHPRA-signed · A$5 platform fee per attended booking
            </Text>
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
          shadowColor: "#1F4F47",
          shadowOpacity: isDentist ? 0 : 0.10,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3,
        }}
      >
        <MaterialCommunityIcons
          name="arrow-left"
          size={20}
          color={isDentist ? "#FFFFFF" : "#2A2520"}
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
              color: isDentist ? "#3F7E73" : "#8A7E70",
              marginTop: 36,
              marginBottom: 18,
              fontWeight: "500",
            }}
          >
            {phase === "phone"
              ? isDentist
                ? mode === "signin"
                  ? "Practitioner portal · Sign in"
                  : "Practitioner portal · Register"
                : mode === "signin"
                  ? "Patient · Sign in"
                  : "Patient · Create account"
              : phase === "otp"
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
            {phase === "phone"
              ? isDentist
                ? mode === "signin"
                  ? "Welcome, doctor."
                  : "Join the panel."
                : mode === "signin"
                  ? "Welcome back."
                  : "Your number."
              : phase === "otp"
                ? "Enter the code."
                : phase === "linkOtp"
                  ? "One more code."
                  : isDentist
                    ? "Your registered name."
                    : "What's your name?"}
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            {phase === "phone"
              ? isDentist
                ? mode === "signin"
                  ? "Sign in with the mobile attached to your AHPRA registration. We'll send a one-time code."
                  : "QuoteMySmile is for AHPRA-registered Australian dentists. You'll add your AHPRA number, ABN and PI insurance after sign-in."
                : mode === "signin"
                  ? "Sign in with the mobile you registered. We'll send a one-time code."
                  : "We'll send a one-time code by SMS. No password, no fuss."
              : phase === "otp"
                ? `Sent to ${phone}. The code expires in 5 minutes.`
                : phase === "linkOtp"
                  ? `Sent to ${secondary}. We'll bind it to this account so you can sign in with either.`
                  : isDentist
                    ? "Use the name on your AHPRA registration, then add your email so you can sign in with either."
                    : "We'll use your name to introduce you to the dentist. Add your email so you can sign in with either."}
          </Text>
        </View>

        <View className="px-8 pb-24">
          {phase === "phone" ? (
            <>
              {/* Phone / Email toggle — picks the right keyboard BEFORE
                  the user types. Tap Email and the keyboard has letters. */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "rgba(95,168,155,0.10)",
                  borderRadius: 12,
                  padding: 4,
                  marginBottom: 22,
                  alignSelf: "center",
                }}
              >
                {(["phone", "email"] as const).map((m) => {
                  const active = method === m;
                  return (
                    <Pressable
                      key={m}
                      onPress={() => {
                        setMethod(m);
                        // If user is mid-typing wrong value, clear it
                        // so the placeholder/format hint guides them.
                        if (
                          (m === "phone" && /[@a-zA-Z]/.test(phone)) ||
                          (m === "email" && /^\+?\d/.test(phone))
                        ) {
                          setPhone("");
                        }
                      }}
                      style={{
                        paddingVertical: 10,
                        paddingHorizontal: 22,
                        borderRadius: 10,
                        backgroundColor: active ? "#1F4F47" : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontSize: 13,
                          letterSpacing: 0.2,
                          color: active ? "#FFFFFF" : "#3F7E73",
                          fontWeight: "600",
                        }}
                      >
                        {m === "phone" ? "Mobile" : "Email"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <FieldLabel
                label={method === "email" ? "Email address" : "Mobile number"}
                hint={
                  method === "email"
                    ? "We'll email you a one-time code."
                    : "AU mobile — 04XX XXX XXX or +61 4XX XXX XXX."
                }
              >
                <TextField
                  value={phone}
                  onChangeText={setPhone}
                  placeholder={
                    method === "email" ? "you@email.com" : "0412 345 678"
                  }
                  keyboardType={method === "email" ? "email-address" : "phone-pad"}
                />
              </FieldLabel>
              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={send}>
                  {busy
                    ? "Sending…"
                    : isDentist
                      ? "Send sign-in code"
                      : isEmail
                        ? "Email code"
                        : "Send code"}
                </Button>
              </View>
              {isDentist ? (
                <View
                  style={{
                    marginTop: 28,
                    paddingTop: 16,
                    borderTopWidth: 1,
                    borderTopColor: "rgba(229,220,200,0.7)",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                  }}
                >
                  <MaterialCommunityIcons name="shield-check-outline" size={14} color="#3F7E73" />
                  <Text
                    style={{
                      fontFamily: "Inter-Medium",
                      fontSize: 10,
                      letterSpacing: 1.6,
                      textTransform: "uppercase",
                      color: "#3F7E73",
                    }}
                  >
                    AHPRA · ABN · PI insurance verified
                  </Text>
                </View>
              ) : (
                <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans text-center mt-6">
                  {REVIEW_CODE_HINT}
                </Text>
              )}
            </>
          ) : phase === "otp" ? (
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
              <View className="items-center gap-3 mt-6">
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
              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={completeProfile}>
                  {busy
                    ? "Sending code…"
                    : linkType === "email"
                      ? "Send email code"
                      : "Send SMS code"}
                </Button>
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
  subtitle,
  icon,
  onPress,
}: {
  role: "patient" | "dentist";
  title: string;
  subtitle: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}) {
  // Tend Dental tactile card: white surface, warm hairline border,
  // soft mint/teal accent disc on the left, editorial serif title and
  // sentence-case Inter subtitle, mint arrow on the right. Reads as
  // editorial healthcare brand rather than marketing pill.
  // Background sits on the wrapper View to dodge the iOS bug where
  // Pressable function-styles intermittently drop backgroundColor.
  const isDentist = role === "dentist";
  const accent = isDentist ? "#1F4F47" : "#5FA89B";
  const accentSoft = isDentist
    ? "rgba(31,79,71,0.10)"
    : "rgba(95,168,155,0.14)";

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(31,79,71,0.10)",
        shadowColor: "#1F4F47",
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={onPress}
        android_ripple={{ color: "rgba(31,79,71,0.06)" }}
        style={({ pressed }) => ({
          paddingVertical: 20,
          paddingHorizontal: 20,
          flexDirection: "row",
          alignItems: "center",
          gap: 16,
          backgroundColor: pressed ? "#FAFAF7" : "transparent",
        })}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={icon} size={24} color={accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: "CormorantGaramond_500Medium",
              fontSize: 22,
              lineHeight: 26,
              color: "#2A2520",
              marginBottom: 2,
              letterSpacing: -0.2,
              includeFontPadding: false,
            }}
          >
            {title}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              fontFamily: "Inter",
              fontSize: 12,
              lineHeight: 16,
              color: "#6E6457",
              letterSpacing: 0.1,
              includeFontPadding: false,
            }}
          >
            {subtitle}
          </Text>
        </View>
        <MaterialCommunityIcons name="arrow-right" size={20} color={accent} />
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
        backgroundColor: "#1F4F47",
      }}
    >
      <LinearGradient
        colors={["#1F4F47", "#2D6E66", "#3F7E73"]}
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
            <MaterialCommunityIcons name="shield-check-outline" size={16} color="#A8DCCB" />
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
