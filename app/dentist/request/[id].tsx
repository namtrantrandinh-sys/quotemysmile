import { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, Image, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { FieldLabel } from "@/components/FieldLabel";
import { TextField } from "@/components/TextField";
import { submitQuote, broadcastTyping } from "@/lib/services/quotes";
import { getMyClinic } from "@/lib/services/dentist";
import { getRequestForDentist } from "@/lib/services/requests";
import { signedPhotoUrl } from "@/lib/services/photos";
import { useUserProfile } from "@/hooks/useUserProfile";
import { scanNote } from "@/lib/ahpraFilter";
import { Checkbox } from "@/components/Checkbox";

const COMPETITORS = [
  { name: "Bright Dental · Kew", total: 349, status: "live" },
  { name: "Smile Co · Hawthorn", total: 420, status: "live" },
];

const TEMPLATE_ITEMS = [
  { code: "011", label: "Comprehensive exam", amount: 75 },
  { code: "022", label: "X-ray, intraoral", amount: 45 },
  { code: "111", label: "Scale + clean", amount: 120 },
  { code: "531", label: "Composite filling", amount: 145 },
];

export default function IncomingRequestScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useUserProfile();
  const [phase, setPhase] = useState<"view" | "build" | "submitted">("view");
  const [items, setItems] = useState(TEMPLATE_ITEMS);
  const [note, setNote] = useState("");
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [emergencyPremiumPct, setEmergencyPremiumPct] = useState(0);

  const baseTotal = items.reduce((s, it) => s + it.amount, 0);
  const premium = Math.round((baseTotal * emergencyPremiumPct) / 100);
  const total = baseTotal + premium;

  const [patientNote, setPatientNote] = useState<string>("");
  const [category, setCategory] = useState<string>("Filling + clean");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [minutesLeft, setMinutesLeft] = useState<number>(28);
  const [qualityScore, setQualityScore] = useState<number | null>(null);

  // Broadcast typing presence when in the build phase
  useEffect(() => {
    if (phase !== "build" || !id || !profile) return;
    const ch = broadcastTyping(id as string, profile.full_name ?? "Dentist");
    return () => {
      (ch as any)?.unsubscribe?.();
    };
  }, [phase, id, profile]);

  useEffect(() => {
    if (!id) return;
    getRequestForDentist(id as string)
      .then(async (row: any) => {
        if (!row) return;
        setCategory(row.category);
        setMinutesLeft(
          Math.max(0, Math.round((new Date(row.closes_at).getTime() - Date.now()) / 60_000)),
        );
        setQualityScore(row.photo_quality_score ?? null);
        const symptomNote =
          (row.symptom_json as { note?: string } | null)?.note ?? "";
        setPatientNote(symptomNote);
        const paths = (row.photo_urls as string[]) ?? [];
        const urls = await Promise.all(
          paths.map((p) =>
            signedPhotoUrl(p, 600).catch(() => null),
          ),
        );
        setPhotoUrls(urls.filter(Boolean) as string[]);
      })
      .catch(() => {});
  }, [id]);

  const handleSubmit = async () => {
    if (!ack1 || !ack2) return;
    const scan = scanNote(note);
    if (!scan.ok) {
      Alert.alert(
        "AHPRA — please revise your note",
        `These words can breach AHPRA advertising rules: ${scan.matches.join(", ")}.\n\nRemove or rephrase before submitting.`,
      );
      return;
    }
    try {
      if (profile?.ahpra_no) {
        // Guard: a quote without a real name shows as "Dentist" on the
        // patient side. Refuse to submit until the dentist has a name on
        // file (set during onboarding).
        const dentistName = (profile.full_name ?? "").trim();
        if (!dentistName) {
          Alert.alert(
            "Add your name",
            "Open Settings and add the name you'd like patients to see before quoting.",
          );
          return;
        }
        const clinic = await getMyClinic();
        if (!clinic) {
          Alert.alert("No clinic", "Finish onboarding to add a clinic first.");
          return;
        }
        await submitQuote({
          requestId: id as string,
          clinicId: (clinic as any).id,
          total,
          items,
          availabilitySlots: [new Date(Date.now() + 24 * 3600_000).toISOString()],
          note,
          ahpraNo: profile.ahpra_no,
          ahpraRegType: (profile.ahpra_reg_type as "General" | "Specialist") ?? "General",
          dentistNameAtQuote: dentistName,
          emergencyPremiumPct,
        });
      }
      setPhase("submitted");
    } catch (e) {
      Alert.alert("Couldn't submit", e instanceof Error ? e.message : "Try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title={`Live request · ${minutesLeft} min left`} />
      <ScrollView>
        {phase === "view" && (
          <View>
            <View className="px-8 pt-12 pb-8">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
                Patient nearby
              </Text>
              <Text className="font-display text-4xl text-espresso mb-2">
                Request
              </Text>
              <Text className="text-sm text-walnut font-sans">{category}</Text>
            </View>

            {patientNote ? (
              <View className="px-8 mb-10">
                <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
                  Patient note
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed italic">
                  "{patientNote}"
                </Text>
              </View>
            ) : null}

            <View className="px-8 mb-10">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
                Photos · {photoUrls.length || 3} attached
              </Text>
              <View className="flex-row gap-3">
                {(photoUrls.length > 0 ? photoUrls : [null, null, null]).map((url, i) => (
                  <View
                    key={i}
                    className="flex-1 aspect-square border border-linen bg-eggshell/40 items-center justify-center overflow-hidden"
                  >
                    {url ? (
                      <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
                    ) : (
                      <Text className="font-display text-2xl text-taupe">◯</Text>
                    )}
                  </View>
                ))}
              </View>
              {qualityScore != null ? (
                <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mt-3">
                  Photo quality {qualityScore.toFixed(1)} / 5
                </Text>
              ) : null}
            </View>

            <View className="px-8 mb-10">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
                Currently quoting · {COMPETITORS.length}
              </Text>
              {COMPETITORS.map((c) => (
                <View
                  key={c.name}
                  className="flex-row items-center justify-between py-3 border-b border-linen"
                >
                  <Text className="font-sans text-sm text-walnut">{c.name}</Text>
                  <Text className="font-display text-xl text-espresso">${c.total}</Text>
                </View>
              ))}
            </View>

            <View className="px-8 pb-24 items-center gap-3">
              <Button variant="primary" size="lg" onPress={() => setPhase("build")}>
                Build my quote
              </Button>
              <Button variant="ghost" size="md" onPress={() => router.back()}>
                Pass
              </Button>
            </View>
          </View>
        )}

        {phase === "build" && (
          <View>
            <View className="px-8 pt-12 pb-8">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
                Quote builder · template: filling + clean
              </Text>
              <Text className="font-display text-4xl text-espresso leading-[1.05]">
                Build your quote.
              </Text>
            </View>

            <View className="px-8 mb-10">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Line items · ADA codes
              </Text>
              {items.map((it, i) => (
                <View key={it.code} className="py-3 border-b border-linen">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="font-display text-sm text-taupe">{it.code}</Text>
                    <Text className="font-display text-xl text-espresso">${it.amount}</Text>
                  </View>
                  <Text className="font-sans text-sm text-walnut">{it.label}</Text>
                </View>
              ))}
            </View>

            {/* Emergency premium — transparent + capped */}
            <View className="px-8 mb-8">
              <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans mb-3">
                Emergency premium · {emergencyPremiumPct}%
              </Text>
              <View className="flex-row gap-2 mb-2">
                {[0, 15, 30, 50].map((p) => {
                  const sel = emergencyPremiumPct === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setEmergencyPremiumPct(p)}
                      className={`flex-1 items-center py-3 border ${
                        sel ? "border-gold bg-gold/10" : "border-linen"
                      }`}
                    >
                      <Text
                        className={`text-[11px] tracking-cap uppercase font-sans ${
                          sel ? "text-gold" : "text-walnut"
                        }`}
                      >
                        {p === 0 ? "None" : `+${p}%`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text className="text-xs text-taupe font-sans leading-relaxed">
                For after-hours / same-day emergencies. Shown to the patient
                as a separate line — they see the uplift before booking. Capped
                at 50% to keep the marketplace honest.
              </Text>
            </View>

            <View className="px-8 mb-10 border-t border-b border-linen py-6">
              <View className="flex-row items-baseline justify-between">
                <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">
                  Base
                </Text>
                <Text className="font-display text-2xl text-walnut">
                  ${baseTotal}
                </Text>
              </View>
              {emergencyPremiumPct > 0 ? (
                <View className="flex-row items-baseline justify-between mt-2">
                  <Text className="text-[11px] tracking-cap uppercase text-clay font-sans">
                    Emergency uplift · {emergencyPremiumPct}%
                  </Text>
                  <Text className="font-display text-2xl text-clay">
                    +${premium}
                  </Text>
                </View>
              ) : null}
              <View className="flex-row items-baseline justify-between mt-3 pt-3 border-t border-linen">
                <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">
                  Total · indicative
                </Text>
                <Text className="font-display text-5xl text-gold">
                  ${total}
                </Text>
              </View>
            </View>

            <View className="px-8 mb-10">
              <FieldLabel
                label="Note to patient"
                hint="Optional, up to 200 characters. Avoid claims about outcomes, satisfaction, or guarantees."
              >
                <TextField
                  value={note}
                  onChangeText={setNote}
                  placeholder="Happy to smooth the sharp edge same-day."
                  multiline
                  maxLength={200}
                />
              </FieldLabel>
            </View>

            <View className="px-8 mb-12">
              <View className="border border-linen bg-eggshell/40 p-5">
                <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-3">
                  Before submitting
                </Text>
                <Checkbox
                  checked={ack1}
                  onToggle={() => setAck1(!ack1)}
                  label="I confirm this quote is based on patient photos only."
                />
                <Checkbox
                  checked={ack2}
                  onToggle={() => setAck2(!ack2)}
                  label="I accept full professional responsibility for this quote."
                />
              </View>
            </View>

            <View className="px-8 pb-24 items-center">
              <Button
                variant="primary"
                size="lg"
                onPress={handleSubmit}
              >
                Submit quote
              </Button>
            </View>
          </View>
        )}

        {phase === "submitted" && (
          <View className="items-center px-8 pt-24 pb-24">
            <View className="h-2 w-2 rounded-full bg-forest mb-12" />
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
              Live · visible to patient
            </Text>
            <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-8">
              Your quote is in.
            </Text>

            <View className="border-y border-linen w-full max-w-md py-8 items-center mb-10">
              <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-2">
                Camberwell Dental · You
              </Text>
              <Text className="font-display text-5xl text-gold mb-1">${total}</Text>
              <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
                Requotes remaining · 1
              </Text>
            </View>

            <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed mb-12">
              You may requote once. After that your quote is final for this
              window.
            </Text>

            <View className="gap-3 items-center">
              <Button
                variant="primary"
                size="md"
                onPress={() => router.push({ pathname: "/dentist/requote/[id]", params: { id: String(id) } })}
              >
                Use my requote
              </Button>
              <Button variant="secondary" size="md" onPress={() => router.back()}>
                Back to dashboard
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
