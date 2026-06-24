import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { FieldLabel } from "@/components/FieldLabel";
import { TextField } from "@/components/TextField";
import { ProgressDots } from "@/components/ProgressDots";
import { Slider } from "@/components/Slider";
import { Icon } from "@/components/Icon";
import { PhotoInfoCard } from "@/components/PhotoInfoCard";
import { GpsRadar } from "@/components/GpsRadar";
import { useLocation, accuracyTier } from "@/hooks/useLocation";
import { setIntake } from "@/lib/intakeStore";
import { nearbyDentistsCount } from "@/lib/services/requests";

export default function LocationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ c?: string }>();
  const loc = useLocation({ auto: true, watch: true });
  const tier = accuracyTier(loc.accuracyM);
  const [postcode, setPostcode] = useState("3124");
  const [radius, setRadius] = useState(10);
  const [count, setCount] = useState<number | null>(null);
  const suburb = loc.suburb || "Camberwell";
  const state = loc.state || "VIC";
  const gpsReady = loc.status === "granted";

  // Live count of verified dentists in range — updates as user slides
  useEffect(() => {
    if (!loc.coords) return;
    nearbyDentistsCount({
      lat: loc.coords.lat,
      lng: loc.coords.lng,
      radiusKm: radius,
      category: params.c,
    })
      .then(setCount)
      .catch(() => setCount(null));
  }, [loc.coords, radius, params.c]);

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar
        title="Step 04 · Location"
        right={<ProgressDots step={4} total={6} />}
      />
      <ScrollView>
        <View className="px-8 pt-12 pb-8 items-center">
          {/* Replace the static radius icon with the live GPS radar — the
              moment the patient sees their GPS lock in around them. Smaller
              size (200) so it doesn't crowd the radius slider below. */}
          <View className="mb-4">
            <GpsRadar size={200} pinCount={5} sweep={gpsReady} />
          </View>
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
            Find dentists near you
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-6">
            How far should we look?
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            GPS picks up your location. Drag the dot to choose how many km.
          </Text>
        </View>

        <View className="px-8 pb-24">
          {/* GPS status block */}
          <View className="bg-eggshell/40 border border-linen p-8 mb-10 items-center">
            <View className="flex-row items-center gap-2 mb-3">
              <View
                className={`h-1.5 w-1.5 rounded-full ${
                  loc.status === "granted"
                    ? "bg-forest"
                    : loc.status === "denied"
                      ? "bg-clay"
                      : "bg-taupe"
                }`}
              />
              <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans">
                {loc.status === "granted"
                  ? "GPS · Locked in"
                  : loc.status === "denied"
                    ? "Permission denied"
                    : loc.status === "prompting"
                      ? "Asking permission…"
                      : "Awaiting location"}
              </Text>
            </View>
            <Text className="font-display text-3xl text-espresso mb-1">
              {suburb}
            </Text>
            <Text className="text-sm text-walnut font-sans">
              {state} {loc.postcode || postcode}
            </Text>
            {loc.accuracyM != null ? (
              <View className="flex-row items-center gap-2 mt-3">
                <View
                  className={`h-1.5 w-1.5 rounded-full ${
                    tier === "excellent"
                      ? "bg-forest"
                      : tier === "good"
                        ? "bg-gold"
                        : "bg-clay"
                  }`}
                />
                <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
                  {tier === "excellent"
                    ? "Excellent · "
                    : tier === "good"
                      ? "Good · "
                      : "Low · "}
                  Accuracy ±{Math.round(loc.accuracyM)} m
                </Text>
              </View>
            ) : null}
            {loc.status === "denied" ? (
              <Text className="text-[11px] tracking-cap uppercase text-clay font-sans mt-4 text-center">
                Enable location in Settings to continue
              </Text>
            ) : null}
          </View>

          {/* Radius slider */}
          <FieldLabel
            label="Search radius"
            hint={`${radius} km — dentists within this range will be invited to quote.`}
          >
            <Slider
              value={radius}
              onChange={setRadius}
              min={2}
              max={30}
              step={1}
              labels={["2 km", "30 km"]}
            />
          </FieldLabel>

          {/* Live count */}
          <View className="border-t border-linen pt-8 mb-10 items-center">
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-2">
              Verified dentists in range
            </Text>
            <View className="flex-row items-baseline gap-3">
              <Text className="font-display text-6xl text-gold leading-none">
                {count == null ? "—" : count}
              </Text>
              <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
                within {radius} km
              </Text>
            </View>
            <Text className="text-xs text-taupe font-sans mt-3 text-center max-w-sm leading-relaxed">
              Each will receive your photos and be invited to send an
              indicative quote within 30 minutes.
            </Text>
          </View>

          {/* Postcode fallback */}
          <FieldLabel
            label="Postcode override"
            hint="Only used if GPS isn't available. Final matching uses GPS."
          >
            <TextField
              value={postcode}
              onChangeText={setPostcode}
              keyboardType="numeric"
              maxLength={4}
            />
          </FieldLabel>

          {/* Privacy */}
          <View className="border-t border-linen pt-8 mb-12">
            <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-3">
              How we use your location
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-2">
              · Find dentists nearby
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-2">
              · Never tracked in the background
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-2">
              · Never sold to third parties
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed">
              · Deleted 30 days after each request
            </Text>
          </View>

          <View className="items-center">
            <Button
              variant="primary"
              size="lg"
              onPress={() => {
                if (!gpsReady || !loc.coords) {
                  loc.request();
                  return;
                }
                setIntake({ coords: loc.coords, radiusKm: radius });
                router.push({ pathname: "/urgency", params: { c: params.c } });
              }}
            >
              {gpsReady
                ? `Send to ${count ?? "nearby"} dentists`
                : "Allow location"}
            </Button>
            {!gpsReady && loc.status !== "denied" ? (
              <Button variant="ghost" size="md" onPress={loc.request}>
                Retry GPS
              </Button>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
