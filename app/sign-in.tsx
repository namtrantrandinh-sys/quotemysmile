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
  verifyPhoneOtp,
  createUserProfile,
  signInWithEmail,
  verifyEmailOtp,
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

  const [phase, setPhase] = useState<"phone" | "otp" | "profile">("phone");
  // Method tab — defaults to phone, user can switch to email so the
  // keyboard is correct from the very first keystroke. Auto-flips to
  // email if they paste an address into the phone field.
  const [method, setMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
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
      if (isEmail) {
        // Email path — Supabase emails the magic code, no Twilio needed.
        await signInWithEmail(phone.trim().toLowerCase());
        setPhase("otp");
        setResendIn(60);
        return;
      }
      const e164 = normalisePhone(phone);
      // AU mobile in E.164 is +614XXXXXXXX = 12 chars. Allow some slack
      // for other valid country codes too.
      if (e164.replace(/\D/g, "").length < 10) {
        Alert.alert(
          "Check your number",
          "Enter your full mobile (e.g. 0412 345 678) or your email address.",
        );
        return;
      }
      setPhone(e164);
      await signInWithPhone(e164);
      setPhase("otp");
      setResendIn(60);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Try again.";
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
        // In SIGN-IN mode we don't want to silently create a brand-new
        // account — confirm with the user first so an existing account
        // mistakenly typing the wrong number doesn't end up with a duplicate.
        if (mode === "signin") {
          Alert.alert(
            "No account on this number",
            "We couldn't find a QuoteMySmile account for this mobile. Create one now?",
            [
              { text: "Try another number", style: "cancel", onPress: () => setPhase("phone") },
              { text: "Create account", onPress: () => setPhase("profile") },
            ],
          );
          return;
        }
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

  const completeProfile = async () => {
    if (!name.trim()) {
      Alert.alert("Your name", "We need your name to introduce you to dentists.");
      return;
    }
    setBusy(true);
    try {
      await createUserProfile({
        role,
        fullName: name.trim(),
        phone,
      });
      router.replace(role === "dentist" ? "/dentist/onboarding" : "/");
    } catch (e) {
      // Surface the real reason. Supabase PostgrestError isn't an Error
      // subclass — relying on `e instanceof Error` previously swallowed
      // RLS rejections behind a generic "Try again.".
      const msg =
        (e as { message?: string })?.message ??
        (typeof e === "string" ? e : "Try again.");
      Alert.alert("Profile error", msg);
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
                fontFamily: "Inter-Medium",
                fontSize: 10,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                color: "#8A7E70",
                marginTop: 36,
                marginBottom: 18,
              }}
            >
              Sign in to QuoteMySmile
            </Text>
            <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-4">
              Who's signing in?
            </Text>
            <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed mb-10">
              We tailor the next steps to whether you're booking dental work or providing it.
            </Text>
          </View>

          <View className="px-6 pb-12" style={{ gap: 14 }}>
            <RoleSignInButton
              role="patient"
              title="I'm a Patient"
              subtitle="Get accurate, AHPRA-signed dental quotes near you."
              icon="account-heart-outline"
              onPress={() => setPickedRole("patient")}
            />
            <RoleSignInButton
              role="dentist"
              title="I'm a Dentist"
              subtitle="AHPRA-registered Australian practitioners — sign live, paid per attendance."
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
          top: 56,
          left: 18,
          width: 38,
          height: 38,
          borderRadius: 19,
          backgroundColor: isDentist ? "rgba(255,255,255,0.18)" : "#FFFFFF",
          borderWidth: isDentist ? 0 : 1,
          borderColor: "#E5DCC8",
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
          name="chevron-left"
          size={24}
          color={isDentist ? "#FFFFFF" : "#2A2520"}
        />
      </Pressable>
      <ScrollView>
        <View className="px-8 pt-10 pb-8 items-center">
          <Wordmark size="md" />
          <Text
            style={{
              fontFamily: "Inter-Medium",
              fontSize: 10,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              color: isDentist ? "#3F7E73" : "#8A7E70",
              marginTop: 36,
              marginBottom: 18,
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
                : isDentist
                  ? "AHPRA on file"
                  : "Almost there"}
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-6">
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
                : isDentist
                  ? "Use the name on your AHPRA registration. We display this to patients on every quote."
                  : "We'll use this to introduce you to the dentist when you book."}
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
                  borderRadius: 999,
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
                        paddingVertical: 8,
                        paddingHorizontal: 22,
                        borderRadius: 999,
                        backgroundColor: active ? "#5FA89B" : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontSize: 11,
                          letterSpacing: 1.4,
                          textTransform: "uppercase",
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
          ) : (
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
              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={completeProfile}>
                  {busy ? "Saving…" : isDentist ? "Continue to AHPRA details" : "Continue"}
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
  // Patient = mint filled + white text (primary CTA).
  // Dentist = transparent + deep-teal border + deep-teal text (outlined
  // secondary). Identical treatment to the welcome screen so the user
  // sees the same role visuals end-to-end.
  const isDentist = role === "dentist";
  const bg = isDentist ? "transparent" : "#5FA89B";
  const bgPressed = isDentist ? "rgba(31,79,71,0.06)" : "#4E9388";
  const fg = isDentist ? "#1F4F47" : "#FFFFFF";
  const fgSubtle = isDentist ? "rgba(31,79,71,0.72)" : "rgba(255,255,255,0.92)";
  const iconBg = isDentist ? "rgba(31,79,71,0.10)" : "rgba(255,255,255,0.18)";
  const borderColor = isDentist ? "#1F4F47" : "transparent";
  const borderWidth = isDentist ? 1.5 : 0;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? bgPressed : bg,
        borderRadius: 22,
        paddingVertical: 18,
        paddingHorizontal: 20,
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
        borderWidth,
        borderColor,
        shadowColor: "#1F4F47",
        shadowOpacity: isDentist ? 0 : 0.25,
        shadowRadius: isDentist ? 0 : 14,
        shadowOffset: { width: 0, height: isDentist ? 0 : 6 },
        elevation: isDentist ? 0 : 5,
      })}
    >
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: iconBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <MaterialCommunityIcons name={icon} size={28} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 17,
            fontWeight: "700",
            color: fg,
            marginBottom: 4,
            letterSpacing: 0.2,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 12,
            color: fgSubtle,
            lineHeight: 17,
          }}
        >
          {subtitle}
        </Text>
      </View>
      <MaterialCommunityIcons name="chevron-right" size={22} color={fgSubtle} />
    </Pressable>
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
