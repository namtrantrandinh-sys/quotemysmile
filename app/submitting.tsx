import { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/Button";
import { ProgressSteps, type Step } from "@/components/ProgressSteps";
import { GpsRadar } from "@/components/GpsRadar";
import { getIntake, clearIntake } from "@/lib/intakeStore";
import { submitRequest, nearbyDentistsCount } from "@/lib/services/requests";
import { uploadRequestPhoto } from "@/lib/services/photos";
import { supabase } from "@/lib/supabase";

export default function SubmittingScreen() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [dentistCount, setDentistCount] = useState<number | null>(null);
  const [steps, setSteps] = useState<Step[]>([
    { label: "Verifying your request", state: "active" },
    { label: "Uploading photos securely", state: "pending" },
    { label: "Notifying nearby dentists", state: "pending" },
    { label: "Opening live quote window", state: "pending" },
  ]);

  const tick = (i: number, state: Step["state"]) =>
    setSteps((s) => s.map((st, idx) => (idx === i ? { ...st, state } : st)));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const intake = getIntake();

        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Fallback: anonymous demo path when not signed in or intake incomplete.
        if (!session || !intake.category || !intake.coords) {
          // Run through demo steps with delay for visual effect
          for (let i = 0; i < steps.length; i++) {
            if (cancelled) return;
            await new Promise((r) => setTimeout(r, 500));
            tick(i, "done");
            if (i < steps.length - 1) tick(i + 1, "active");
          }
          setTimeout(() => !cancelled && router.replace("/live"), 600);
          return;
        }

        tick(0, "done");
        tick(1, "active");

        const created = await submitRequest({
          category: intake.category,
          symptomJson: intake.symptomJson ?? {},
          healthFund: intake.healthFund,
          photoUrls: [],
          photoQualityScore: intake.photoQualityScore ?? 0,
          coords: intake.coords,
          radiusKm: intake.radiusKm ?? 10,
          urgency: intake.urgency,
        });

        // Upload photos in parallel — slot names must match the four
        // capture slots in usePhotoCapture.ts (front-smile, upper-arch,
        // lower-arch, problem-area). Previously the lower-arch label was
        // missing and a photo would silently be filed as `photo-2`.
        const slotNames = [
          "front-smile",
          "upper-arch",
          "lower-arch",
          "problem-area",
        ] as const;
        // If the slot was captured as video, the uri ends with .mov / .mp4.
        // Detect by extension and route through the video upload path so
        // the content-type and file extension match.
        const uploads = (intake.photoUris ?? []).map((uri, i) => {
          const isVideo = /\.(mov|mp4|m4v)$/i.test(uri);
          return uploadRequestPhoto({
            requestId: created.id,
            slotName: slotNames[i] ?? `photo-${i}`,
            fileUri: uri,
            kind: isVideo ? "video" : "photo",
          });
        });
        const results = await Promise.all(uploads);
        const photoPaths = results.map((r) => r.path);

        if (photoPaths.length) {
          await supabase
            .from("requests")
            .update({ photo_urls: photoPaths })
            .eq("id", created.id);
        }

        tick(1, "done");
        tick(2, "active");
        // Look up the real count we just broadcast to
        try {
          const c = await nearbyDentistsCount({
            lat: intake.coords.lat,
            lng: intake.coords.lng,
            radiusKm: intake.radiusKm ?? 10,
            category: intake.category,
          });
          if (!cancelled) setDentistCount(c);
        } catch {}
        await new Promise((r) => setTimeout(r, 400));
        tick(2, "done");
        tick(3, "active");
        await new Promise((r) => setTimeout(r, 300));
        tick(3, "done");

        clearIntake();
        if (!cancelled) {
          setTimeout(
            () =>
              !cancelled &&
              router.replace({ pathname: "/live", params: { request: created.id } }),
            400,
          );
        }
      } catch (e) {
        // Surface the real cause. Supabase PostgrestError isn't an Error
        // instance, so the old `e instanceof Error ? e.message : "Submit failed"`
        // collapsed every database problem to the bare "Submit failed"
        // text — which is exactly what the patient sees right now and
        // gives us nothing to debug from. Read .message off whatever
        // shape we got.
        console.error("[QMS] submit failed:", e);
        if (!cancelled) {
          const msg =
            e instanceof Error
              ? e.message
              : typeof e === "object" && e && "message" in e &&
                typeof (e as { message: unknown }).message === "string"
                ? (e as { message: string }).message
                : "Submit failed";
          setError(msg);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <View className="flex-1 items-center justify-center px-8">
        {error ? (
          <View className="items-center">
            <View className="h-2 w-2 rounded-full bg-clay mb-12" />
            <Text className="text-[11px] tracking-editorial uppercase text-clay font-sans mb-6">
              Something went wrong
            </Text>
            <Text className="font-display text-3xl text-espresso text-center leading-[1.1] mb-8">
              {error}
            </Text>
            <Button variant="secondary" size="md" onPress={() => router.back()}>
              Try again
            </Button>
          </View>
        ) : (
          <View className="items-center w-full">
            {/* GpsRadar — the dopamine moment. Replaces the previous bullet
                dot; rings pulse outward, mint sweep rotates, dentist pins
                fade in around the perimeter as the broadcast goes out. */}
            <View className="mb-6">
              <GpsRadar size={240} pinCount={6} />
            </View>
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
              Broadcasting your request
            </Text>
            <Text className="font-display text-4xl text-espresso text-center leading-[1.1] mb-2">
              Quotes will appear
            </Text>
            <Text className="font-display italic text-4xl text-gold text-center leading-[1.1] mb-12">
              shortly.
            </Text>
            <ProgressSteps steps={steps} />
            {dentistCount != null ? (
              <View className="mt-12 items-center">
                <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-2">
                  Broadcasting to
                </Text>
                <Text className="font-display text-4xl text-gold">
                  {dentistCount} {dentistCount === 1 ? "dentist" : "dentists"}
                </Text>
              </View>
            ) : null}
            <Text className="text-xs text-taupe font-sans text-center max-w-sm leading-relaxed mt-12">
              Window stays open for thirty minutes. We'll alert you the moment
              a dentist responds.
            </Text>
          </View>
        )}
      </View>
      <View className="px-8 py-10 items-center">
        <Wordmark size="sm" />
      </View>
    </SafeAreaView>
  );
}
