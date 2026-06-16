import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
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
  const role = params.role === "dentist" ? "dentist" : "patient";
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
      Alert.alert("Profile error", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-bone">
      <WaterBanner />
      <ScrollView>
        <View className="px-8 pt-12 pb-8 items-center">
          <Wordmark size="md" />
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mt-10 mb-6">
            {phase === "phone"
              ? role === "dentist"
                ? "Dentist · " + (mode === "signin" ? "Sign in" : "Create account")
                : mode === "signin"
                  ? "Sign in"
                  : "Create account"
              : phase === "otp"
                ? "Verify"
                : "Almost there"}
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-6">
            {phase === "phone"
              ? mode === "signin"
                ? "Welcome back."
                : "Your number."
              : phase === "otp"
                ? "Enter the code."
                : "What's your name?"}
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            {phase === "phone"
              ? mode === "signin"
                ? "Sign in with the mobile you registered. We'll send a 6-digit code."
                : "We'll send a 6-digit code by SMS. No password, no fuss."
              : phase === "otp"
                ? `Sent to ${phone}. The code expires in 5 minutes.`
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
                    ? "We'll email you a 6-digit code."
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
                    : isEmail
                      ? "Email code"
                      : "Send code"}
                </Button>
              </View>
              <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans text-center mt-6">
                {REVIEW_CODE_HINT}
              </Text>
            </>
          ) : phase === "otp" ? (
            <>
              <FieldLabel label="6-digit code">
                <TextField
                  value={code}
                  onChangeText={setCode}
                  placeholder="123456"
                  keyboardType="numeric"
                  maxLength={6}
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
              <FieldLabel label="Full name" hint="As you'd like the dentist to address you.">
                <TextField value={name} onChangeText={setName} placeholder="Sarah K" />
              </FieldLabel>
              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={completeProfile}>
                  {busy ? "Saving…" : "Continue"}
                </Button>
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
