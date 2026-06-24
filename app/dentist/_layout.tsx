import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function DentistLayout() {
  const router = useRouter();
  const segments = useSegments() as string[];
  const { isDentist, loading, signedIn } = useUserProfile();

  // Dual-role guard: /dentist/* is reserved for users who hold a
  // dentist_profiles row. A patient-only signed-in user (or a signed-out
  // user) is bounced to the dentist sign-in. /dentist/onboarding is the
  // ONE exception — that's where a freshly authed user creates the
  // dentist_profiles row, so we can't gate on it existing yet.
  useEffect(() => {
    if (loading) return;
    if (!segments[0] || segments[0] !== ("dentist" as any)) return;
    if (!signedIn) {
      router.replace({
        pathname: "/sign-in",
        params: { role: "dentist", mode: "signin" },
      });
      return;
    }
    const onOnboarding = segments[1] === ("onboarding" as any);
    if (!isDentist && !onOnboarding) {
      router.replace("/dentist/onboarding");
    }
  }, [loading, signedIn, isDentist, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F5F1E8" },
        animation: "fade",
      }}
    />
  );
}
