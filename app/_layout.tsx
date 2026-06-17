import "../global.css";
import "@/lib/observability";
import React, { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useFonts } from "expo-font";
import {
  CormorantGaramond_300Light,
  CormorantGaramond_400Regular,
  CormorantGaramond_400Regular_Italic,
  CormorantGaramond_500Medium,
} from "@expo-google-fonts/cormorant-garamond";
import {
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
} from "@expo-google-fonts/inter";
import {
  PlayfairDisplay_500Medium,
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
} from "@expo-google-fonts/playfair-display";
import {
  Caveat_500Medium,
  Caveat_600SemiBold,
  Caveat_700Bold,
} from "@expo-google-fonts/caveat";
import {
  Cinzel_400Regular,
  Cinzel_500Medium,
  Cinzel_600SemiBold,
  Cinzel_700Bold,
} from "@expo-google-fonts/cinzel";
import { Allura_400Regular } from "@expo-google-fonts/allura";
import { Italiana_400Regular } from "@expo-google-fonts/italiana";
import {
  Lora_400Regular,
  Lora_500Medium,
  Lora_600SemiBold,
  Lora_400Regular_Italic,
  Lora_500Medium_Italic,
} from "@expo-google-fonts/lora";
import * as SplashScreen from "expo-splash-screen";
import * as Updates from "expo-updates";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { hasSeenOnboarding, markOnboardingSeen } from "@/lib/firstLaunch";
import { supabase } from "@/lib/supabase";
import { hydrateIntake } from "@/lib/intakeStore";
// Metro aliases @stripe/stripe-react-native to a no-op stub on web — see
// metro.config.js. Native bundles get the real provider.
import { StripeProvider } from "@stripe/stripe-react-native";

const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
// Stripe SDK crashes on empty / placeholder / malformed keys.
// Real Stripe keys are pk_test_xxx or pk_live_xxx (≥80 chars, alphanumeric only).
const HAS_STRIPE_KEY =
  (STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_") ||
    STRIPE_PUBLISHABLE_KEY.startsWith("pk_live_")) &&
  STRIPE_PUBLISHABLE_KEY.length > 30 &&
  !STRIPE_PUBLISHABLE_KEY.includes("REPLACE") &&
  !STRIPE_PUBLISHABLE_KEY.includes("YOUR_KEY");

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    CormorantGaramond: CormorantGaramond_400Regular,
    "CormorantGaramond-Light": CormorantGaramond_300Light,
    "CormorantGaramond-Italic": CormorantGaramond_400Regular_Italic,
    "CormorantGaramond-Medium": CormorantGaramond_500Medium,
    Inter: Inter_400Regular,
    "Inter-Light": Inter_300Light,
    "Inter-Medium": Inter_500Medium,
    PlayfairDisplay: PlayfairDisplay_500Medium,
    "PlayfairDisplay-SemiBold": PlayfairDisplay_600SemiBold,
    "PlayfairDisplay-Bold": PlayfairDisplay_700Bold,
    Caveat: Caveat_500Medium,
    "Caveat-SemiBold": Caveat_600SemiBold,
    "Caveat-Bold": Caveat_700Bold,
    // Brand display: Cinzel (Roman caps) + Allura (script "my") + Italiana (editorial hero)
    Cinzel: Cinzel_400Regular,
    "Cinzel-Medium": Cinzel_500Medium,
    "Cinzel-SemiBold": Cinzel_600SemiBold,
    "Cinzel-Bold": Cinzel_700Bold,
    Allura: Allura_400Regular,
    Italiana: Italiana_400Regular,
    Lora: Lora_400Regular,
    "Lora-Medium": Lora_500Medium,
    "Lora-SemiBold": Lora_600SemiBold,
    "Lora-Italic": Lora_400Regular_Italic,
    "Lora-MediumItalic": Lora_500Medium_Italic,
  });

  const [splashDone, setSplashDone] = useState(false);
  const [hasRouted, setHasRouted] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Keep the native splash visible for a minimum dwell time so the
    // QUOTE my SMILE lockup gets to register before the animated splash
    // takes over — no two-flash artefact on fast launches.
    if (loaded) {
      const NATIVE_SPLASH_MIN_DURATION_MS = 1400;
      const t = setTimeout(() => {
        SplashScreen.hideAsync();
      }, NATIVE_SPLASH_MIN_DURATION_MS);
      return () => clearTimeout(t);
    }
  }, [loaded]);

  useEffect(() => {
    // Restore any in-progress intake from disk so a backgrounded capture
    // session can resume on next launch. Fire-and-forget; failure is safe.
    void hydrateIntake();
  }, []);

  useEffect(() => {
    // Force OTA to apply on the SAME launch it was downloaded. By default
    // expo-updates uses ON_LOAD policy: download in background on launch N,
    // apply on launch N+1. That two-launch delay made the phone feel like
    // it was ignoring EAS updates entirely. Here we explicitly check on
    // boot, download if newer, then reload — so the user sees the new
    // bundle on the very next cold start.
    if (!Updates.isEnabled || __DEV__) return;
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (result.isAvailable) {
          await Updates.fetchUpdateAsync();
          await Updates.reloadAsync();
        }
      } catch {
        // Network down / Expo unreachable — silently fall back to the
        // embedded bundle. Never block app launch on an OTA check.
      }
    })();
  }, []);

  useEffect(() => {
    if (!splashDone || hasRouted) return;
    setHasRouted(true);
    // First-launch routing — only when sitting on root
    const onRoot =
      !segments[0] ||
      segments[0] === ("(tabs)" as any) ||
      (segments as any).length === 0;
    if (!onRoot) return;

    // Skip onboarding if EITHER:
    //   (a) the user has already completed it on this device, OR
    //   (b) the user is already signed in (has an account) — covers fresh
    //       installs and new devices for existing customers.
    void Promise.all([
      hasSeenOnboarding(),
      supabase.auth.getSession().then((r) => !!r.data.session).catch(() => false),
    ]).then(([seen, signedIn]) => {
      if (signedIn && !seen) {
        // First time on this device but they already have an account —
        // record it so they don't get prompted again on this device.
        void markOnboardingSeen();
      }
      if (!seen && !signedIn) {
        router.replace("/onboarding");
      }
    });
  }, [splashDone, hasRouted, router, segments]);

  if (!loaded) return null;

  const tree = (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#F5F1E8" },
          animation: "fade",
        }}
      />
      {!splashDone ? (
        <AnimatedSplash onDone={() => setSplashDone(true)} />
      ) : null}
    </>
  );

  return (
    <SafeAreaProvider>
      {HAS_STRIPE_KEY ? (
        <StripeProvider
          publishableKey={STRIPE_PUBLISHABLE_KEY}
          merchantIdentifier="merchant.com.quotemysmile.app"
        >
          {tree}
        </StripeProvider>
      ) : (
        tree
      )}
    </SafeAreaProvider>
  );
}
