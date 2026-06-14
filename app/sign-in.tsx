import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
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
const REVIEW_CODE_HINT = "Apple Review can use review@quotemysmile.com.au";

function looksLikeReviewEmail(value: string) {
  return value.trim().toLowerCase() === REVIEW_EMAIL;
}

export default function SignInScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ role?: "patient" | "dentist"; mode?: "signin" | "signup" }>();
  const role = params.role === "dentist" ? "dentist" : "patient";
  const mode = params.mode === "signin" ? "signin" : "signup";

  const [phase, setPhase] = useState<"phone" | "otp" | "profile">("phone");
  const [phone, setPhone] = useState("+61");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const isReview = looksLikeReviewEmail(phone);

  const send = async () => {
    setBusy(true);
    try {
      if (isReview) {
        // App-Review path — Supabase emails the magic code, no Twilio needed.
        await signInWithEmail(REVIEW_EMAIL);
        setPhase("otp");
        return;
      }
      if (phone.replace(/\D/g, "").length < 10) {
        Alert.alert("Check your number", "Include +61 and your full mobile.");
        return;
      }
      await signInWithPhone(phone);
      setPhase("otp");
    } catch (e) {
      Alert.alert("Couldn't send code", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    try {
      if (isReview) {
        await verifyEmailOtp(REVIEW_EMAIL, code);
      } else {
        await verifyPhoneOtp(phone, code);
      }
      // Check if profile exists
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No session after verify");
      const { data: profile } = await supabase
        .from("users")
        .select("id, role, full_name")
        .eq("id", user.id)
        .maybeSingle();
      if (!profile) {
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
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar />
      <ScrollView>
        <View className="px-8 pt-16 pb-8 items-center">
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
              <FieldLabel
                label={isReview ? "Review email" : "Mobile number"}
                hint={
                  isReview
                    ? "App Review path — magic link via email."
                    : "Include +61 — Australian mobiles only."
                }
              >
                <TextField
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+61 412 345 678"
                  keyboardType={isReview ? "email-address" : "phone-pad"}
                />
              </FieldLabel>
              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={send}>
                  {busy
                    ? "Sending…"
                    : isReview
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
                  placeholder="123 456"
                  keyboardType="numeric"
                  maxLength={6}
                />
              </FieldLabel>
              <View className="items-center gap-3 mt-6">
                <Button variant="primary" size="lg" onPress={verify}>
                  {busy ? "Verifying…" : "Verify"}
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
    </SafeAreaView>
  );
}
