import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { SketchIcon } from "@/components/SketchIcon";
import { createClinic, verifyCredentials } from "@/lib/services/dentist";
import { useUserProfile } from "@/hooks/useUserProfile";
import type { CategoryId } from "@/lib/types";

const ALL_CATS: { id: CategoryId; label: string }[] = [
  { id: "filling-clean", label: "Filling + clean" },
  { id: "checkup-clean", label: "Check-up + clean" },
  { id: "whitening", label: "Whitening" },
  { id: "cosmetic", label: "Cosmetic" },
  { id: "crown-veneer", label: "Crown + veneer" },
  { id: "implant", label: "Implant" },
  { id: "wisdom", label: "Wisdom" },
  { id: "ortho", label: "Ortho" },
  { id: "emergency", label: "Emergency" },
];

const RADII = [5, 10, 15, 20, 30];

const ABN_RE = /^\d{11}$/;

async function geocodeAddress(
  addr: string,
): Promise<{ lat: number; lng: number }> {
  try {
    const r = await Location.geocodeAsync(addr);
    if (r[0]) return { lat: r[0].latitude, lng: r[0].longitude };
  } catch {}
  return { lat: -37.831, lng: 145.058 };
}

/**
 * Lean "add another practice" flow. Skips the AHPRA + insurance steps
 * from full onboarding since both travel with the dentist (one row on
 * users), not the clinic. We collect:
 *   - Trading name
 *   - ABN (11 digits, gets verified after save)
 *   - Address (geocoded to a coordinate for the geofence)
 *   - Service radius
 *   - Categories
 * Then create the clinic and kick off ABN verification.
 */
export default function AddPracticeScreen() {
  const router = useRouter();
  const { dentist } = useUserProfile();
  const [name, setName] = useState("");
  const [abn, setAbn] = useState("");
  const [address, setAddress] = useState("");
  const [radius, setRadius] = useState(10);
  const [cats, setCats] = useState<Set<CategoryId>>(
    new Set(["filling-clean", "checkup-clean", "emergency"]),
  );
  const [busy, setBusy] = useState(false);

  const cleanAbn = abn.replace(/\s/g, "");
  const valid =
    name.trim().length >= 2 &&
    ABN_RE.test(cleanAbn) &&
    address.trim().length >= 8 &&
    cats.size > 0;

  const toggleCat = (id: CategoryId) => {
    const next = new Set(cats);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCats(next);
  };

  const save = async () => {
    if (!valid) {
      Alert.alert(
        "Missing details",
        "Trading name, ABN (11 digits), address, and at least one category are required.",
      );
      return;
    }
    setBusy(true);
    try {
      const coords = await geocodeAddress(address);
      const created = await createClinic({
        name,
        abn: cleanAbn,
        address,
        coords,
        serviceRadiusKm: radius,
        categories: Array.from(cats),
      });
      // Kick off ABN verification in the background. AHPRA is already
      // verified on the dentist row from initial onboarding — no need
      // to re-check it for a second clinic.
      if (dentist?.ahpra_no && created?.id) {
        void verifyCredentials({
          ahpraNo: dentist.ahpra_no,
          expectedName: dentist.full_name ?? "",
          abn: cleanAbn,
          clinicId: created.id,
        });
      }
      router.replace("/dentist/settings");
    } catch (e) {
      Alert.alert(
        "Couldn't save",
        e instanceof Error ? e.message : "Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Add practice" />
      <ScrollView>
        <View className="px-8 pt-10 pb-6">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            New practice
          </Text>
          <Text className="font-display text-4xl text-espresso leading-[1.05] mb-3">
            Where else do you practise?
          </Text>
          <Text className="text-sm text-walnut font-sans leading-relaxed">
            Add another clinic and you'll receive live nearby requests from its
            catchment too. Each practice has its own radius and categories.
          </Text>
        </View>

        {/* Trading name */}
        <Field
          label="Trading name"
          value={name}
          onChange={setName}
          placeholder="e.g. Brighton Smile Studio"
        />

        {/* ABN */}
        <Field
          label="ABN"
          value={abn}
          onChange={setAbn}
          placeholder="11 digits — e.g. 12 345 678 901"
          keyboardType="number-pad"
          maxLength={14}
          helper={
            cleanAbn.length > 0 && !ABN_RE.test(cleanAbn)
              ? "ABN must be 11 digits."
              : "Verified against the public ABR register after you save."
          }
        />

        {/* Address */}
        <Field
          label="Address"
          value={address}
          onChange={setAddress}
          placeholder="123 High St, Brighton VIC 3186"
          autoCapitalize="words"
          helper="Used to draw the geofence for nearby requests."
        />

        {/* Radius */}
        <View className="px-8 pb-6">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Service radius
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {RADII.map((r) => {
              const sel = radius === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setRadius(r)}
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 12,
                    minHeight: 44,
                    justifyContent: "center",
                    borderWidth: 1,
                    borderRadius: 10,
                    backgroundColor: sel ? "#2E7268" : "transparent",
                    borderColor: sel ? "#2E7268" : "rgba(31,79,71,0.18)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 11,
                      letterSpacing: 1.0,
                      textTransform: "uppercase",
                      color: sel ? "#FFFFFF" : "#2A2520",
                      fontWeight: "700",
                    }}
                  >
                    {r} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Categories */}
        <View className="px-8 pb-6">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Categories at this practice
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ALL_CATS.map((c) => {
              const sel = cats.has(c.id);
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggleCat(c.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    minHeight: 38,
                    borderRadius: 999,
                    borderWidth: 1,
                    backgroundColor: sel ? "rgba(200,167,90,0.14)" : "transparent",
                    borderColor: sel ? "#C8A75A" : "rgba(31,79,71,0.18)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 11,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: sel ? "#8E7430" : "#6E6457",
                      fontWeight: "700",
                    }}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* CTA */}
        <View className="px-8 pb-12 pt-4">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onPress={save}
            disabled={!valid || busy}
            leftSketch="plus"
          >
            {busy ? "Saving practice…" : "Save practice"}
          </Button>
          {busy ? (
            <View style={{ alignItems: "center", marginTop: 12 }}>
              <ActivityIndicator color="#2E7268" />
            </View>
          ) : null}
          <Text className="text-xs text-taupe font-sans text-center mt-4 leading-relaxed">
            Your AHPRA registration carries over — only ABN is re-checked for
            this practice. You can edit radius + categories later.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  helper,
  keyboardType,
  maxLength,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  helper?: string;
  keyboardType?: "default" | "number-pad" | "email-address" | "phone-pad";
  maxLength?: number;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View className="px-8 pb-6">
      <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#A89B88"
        keyboardType={keyboardType ?? "default"}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        style={{
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "rgba(31,79,71,0.14)",
          borderRadius: 12,
          paddingHorizontal: 16,
          paddingVertical: 14,
          minHeight: 50,
          fontFamily: "Inter",
          fontSize: 15,
          color: "#2A2520",
        }}
      />
      {helper ? (
        <Text className="text-xs text-taupe font-sans mt-2">{helper}</Text>
      ) : null}
    </View>
  );
}
