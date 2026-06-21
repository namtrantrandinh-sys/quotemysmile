import { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { useUserProfile } from "@/hooks/useUserProfile";

export default function DentistLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { profile, loading, signedIn } = useUserProfile();

  // Guard the dentist namespace: a patient (or a not-signed-in user) who
  // somehow lands on /dentist/* via a deep link or a stale router stack
  // is bounced back to the patient welcome rather than seeing the
  // dentist dashboard / quoting UI. Reverse of the dentist redirect in
  // app/index.tsx so each role only ever sees its own surface.
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
    if (profile && profile.role !== "dentist") {
      router.replace("/");
    }
  }, [loading, signedIn, profile, segments, router]);

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
