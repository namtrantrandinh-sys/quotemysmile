import { useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { ProgressDots } from "@/components/ProgressDots";
import { Checkbox } from "@/components/Checkbox";
import { Icon } from "@/components/Icon";
import { setIntake } from "@/lib/intakeStore";
import { URGENCY_META, type Urgency } from "@/lib/types";

const STANDARD: Urgency[] = ["1h", "few", "24h", "3d"];

export default function UrgencyScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ c?: string }>();
  const [choice, setChoice] = useState<Urgency>("24h");
  const [emergencyAck, setEmergencyAck] = useState(false);

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

        <View className="px-8 pb-8">
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Standard
          </Text>
          {STANDARD.map((u) => (
            <Pressable
              key={u}
              onPress={() => {
                setChoice(u);
                setEmergencyAck(false);
              }}
              className={`border ${
                choice === u ? "border-espresso bg-eggshell/40" : "border-linen"
              } px-5 py-5 mb-3 flex-row items-center justify-between`}
            >
              <View className="flex-1">
                <Text className="font-display text-xl text-espresso mb-1">
                  {URGENCY_META[u].label}
                </Text>
                <Text className="text-xs text-taupe font-sans">
                  {URGENCY_META[u].feeNote}
                </Text>
              </View>
              <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
                {URGENCY_META[u].window}
              </Text>
            </Pressable>
          ))}
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
              setIntake({ urgency: choice });
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
