import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { ProgressDots } from "@/components/ProgressDots";
import { Checkbox } from "@/components/Checkbox";
import { Icon } from "@/components/Icon";
import { setIntake, getIntake } from "@/lib/intakeStore";
import { URGENCY_META, type Urgency } from "@/lib/types";

const STANDARD: Urgency[] = ["1h", "few", "24h", "3d"];

/**
 * Booking-readiness funnel (industry research: pre-qualifying intent
 * dramatically improves lead quality for dentists, which keeps them on
 * the platform). Dentists see this on the quote builder + prioritise
 * "ready_now" leads. Stored inside symptom_json so no schema change.
 */
const READINESS = [
  { id: "ready_now", label: "Ready to book this week", hint: "Hot lead" },
  { id: "this_month", label: "Within a month", hint: "" },
  { id: "browsing", label: "Just researching", hint: "" },
] as const;
type Readiness = (typeof READINESS)[number]["id"];

export default function UrgencyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ c?: string }>();
  const [choice, setChoice] = useState<Urgency>("24h");
  const [emergencyAck, setEmergencyAck] = useState(false);
  const [readiness, setReadiness] = useState<Readiness>("ready_now");

  const meta = URGENCY_META[choice];
  const blocked = choice === "emergency" && !emergencyAck;

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar
        title="Step 05 · Urgency"
        right={<ProgressDots step={5} total={6} />}
      />
      <ScrollView>
        <View className="px-8 pt-12 pb-8 items-center">
          <View className="mb-6">
            <Icon name="clock" size={56} />
          </View>
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
            How fast?
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-6">
            When do you need a quote?
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            The shorter the window, the more dentists move on it. Longer
            windows mean more quotes to compare.
          </Text>
        </View>

        <View className="px-6 pb-8">
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-3" style={{ paddingHorizontal: 4 }}>
            Standard
          </Text>
          {STANDARD.map((u) => {
            const selected = choice === u;
            return (
              <View
                key={u}
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 18,
                  borderWidth: selected ? 2 : 1,
                  borderColor: selected ? "#5FA89B" : "rgba(31,79,71,0.08)",
                  shadowColor: selected ? "#2E7268" : "#2E7268",
                  shadowOpacity: selected ? 0.18 : 0.08,
                  shadowRadius: selected ? 16 : 10,
                  shadowOffset: { width: 0, height: selected ? 8 : 4 },
                  elevation: selected ? 5 : 2,
                  marginBottom: 12,
                  overflow: "hidden",
                }}
              >
                <Pressable
                  onPress={() => {
                    setChoice(u);
                    setEmergencyAck(false);
                  }}
                  android_ripple={{ color: "rgba(31,79,71,0.06)" }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
                >
                  <View
                    style={{
                      paddingVertical: 18,
                      paddingHorizontal: 18,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                  {/* Mint check disc on selected — gives the card a clear
                      "this is the choice" affordance instead of a hairline
                      border that the user said reads as a book entry. */}
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 12,
                      borderWidth: selected ? 0 : 1.5,
                      borderColor: "rgba(31,79,71,0.25)",
                      backgroundColor: selected ? "#5FA89B" : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {selected ? (
                      <View
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: "#FFFFFF",
                        }}
                      />
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontWeight: "700",
                        fontSize: 17,
                        color: "#2A2520",
                        marginBottom: 2,
                        letterSpacing: 0.1,
                      }}
                    >
                      {URGENCY_META[u].label}
                    </Text>
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 12,
                        color: "#6E6457",
                        lineHeight: 16,
                      }}
                    >
                      {URGENCY_META[u].feeNote}
                    </Text>
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 999,
                      backgroundColor: selected ? "rgba(95,168,155,0.16)" : "rgba(31,79,71,0.06)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 9.5,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        color: selected ? "#2E7268" : "#6E6457",
                        fontWeight: "700",
                      }}
                    >
                      {URGENCY_META[u].window}
                    </Text>
                  </View>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* Emergency tile */}
        <View className="px-8 pb-8">
          <Text className="text-[10px] tracking-editorial uppercase text-clay font-sans mb-3">
            Emergency
          </Text>
          <Pressable
            onPress={() => setChoice("emergency")}
            className={`border-2 ${
              choice === "emergency" ? "border-clay bg-clay/5" : "border-clay/40"
            } px-5 py-6`}
          >
            <View className="flex-row items-center justify-between mb-3">
              <View className="flex-row items-center gap-3">
                <Icon name="emergency" size={24} color="#9E5E47" />
                <Text className="font-display text-2xl text-clay">
                  Emergency · URGENT
                </Text>
              </View>
              <Text className="text-[10px] tracking-cap uppercase text-clay font-sans">
                15 min window
              </Text>
            </View>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-3">
              For real pain, swelling, broken or knocked-out teeth. The
              request is broadcast immediately to dentists who have
              Emergency mode active.
            </Text>
            <View className="border-t border-clay/30 pt-4 mt-1">
              <Text className="text-[11px] tracking-cap uppercase text-clay font-sans mb-2">
                Premium fee notice
              </Text>
              <Text className="text-sm text-walnut font-sans leading-relaxed">
                Quotes will be 30–50% above standard because the work is
                classified URGENT and PRIORITY by AHPRA. Dentists drop
                other appointments for emergencies.
              </Text>
            </View>
          </Pressable>

          {choice === "emergency" ? (
            <View className="border border-linen bg-eggshell/40 p-5 mt-4">
              <Checkbox
                checked={emergencyAck}
                onToggle={() => setEmergencyAck(!emergencyAck)}
                label="I understand this is an emergency request, premium fees apply, and the response window is 15 minutes."
              />
            </View>
          ) : null}
        </View>

        {/* Booking readiness — fast 3-option tap, no extra screen. */}
        <View className="px-8 pb-2">
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Booking readiness
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-2">
            {READINESS.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setReadiness(r.id)}
                className={`px-4 py-2 border ${
                  readiness === r.id ? "border-espresso bg-eggshell/60" : "border-linen"
                }`}
              >
                <Text className="font-sans text-sm text-espresso">{r.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-[11px] text-taupe font-sans mb-8">
            Dentists prioritise patients ready to book — your timeline is
            never shared verbatim, just a hot/cold flag.
          </Text>
        </View>

        {/* Confirmation summary */}
        <View className="px-8 mb-12">
          <View className={`border ${meta.tone === "clay" ? "border-clay/40" : "border-linen"} bg-eggshell/40 p-5 items-center`}>
            <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-2">
              You picked
            </Text>
            <Text
              className={`font-display text-3xl mb-2 ${
                meta.tone === "clay" ? "text-clay" : "text-gold"
              }`}
            >
              {meta.label}
            </Text>
            <Text className="text-xs text-walnut font-sans">{meta.window}</Text>
          </View>
        </View>

        <View className="px-8 pb-24 items-center">
          <Button
            variant="primary"
            size="lg"
            onPress={() => {
              if (blocked) {
                Alert.alert("Please confirm", "Tick the emergency acknowledgement to continue.");
                return;
              }
              // Layer urgency + booking readiness into the existing
              // symptomJson so dentists see both on the quote builder.
              // No new schema column — symptomJson is the catch-all.
              const prevSymptoms = getIntake().symptomJson ?? {};
              setIntake({
                urgency: choice,
                symptomJson: { ...prevSymptoms, __booking_readiness: readiness },
              });
              router.push("/submitting");
            }}
          >
            Continue
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
