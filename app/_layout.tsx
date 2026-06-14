import "../global.css";
import "@/lib/observability";
import { useEffect, useState } from "react";
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
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AnimatedSplash } from "@/components/AnimatedSplash";
import { hasSeenOnboarding } from "@/lib/firstLaunch";
import { StripeProvider } from "@stripe/stripe-react-native";

const STRIPE_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";

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
  });

  const [splashDone, setSplashDone] = useState(false);
  const [hasRouted, setHasRouted] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  useEffect(() => {
    if (!splashDone || hasRouted) return;
    setHasRouted(true);
    // First-launch routing — only when sitting on root
    const onRoot =
      !segments[0] ||
      segments[0] === ("(tabs)" as any) ||
      (segments as any).length === 0;
    if (onRoot) {
      hasSeenOnboarding().then((seen) => {
        if (!seen) router.replace("/onboarding");
      });
    }
  }, [splashDone, hasRouted, router, segments]);

  if (!loaded) return null;

  return (
    <SafeAreaProvider>
      <StripeProvider
        publishableKey={STRIPE_PUBLISHABLE_KEY}
        merchantIdentifier="merchant.com.quotemysmile.app"
      >
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
      </StripeProvider>
    </SafeAreaProvider>
  );
}
