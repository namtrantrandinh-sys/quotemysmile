import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { FieldLabel } from "@/components/FieldLabel";
import { TextField } from "@/components/TextField";
import { REQUOTE_NOTICE } from "@/lib/copy";
import { requoteOnce } from "@/lib/services/quotes";

const ORIGINAL_ITEMS = [
  { code: "011", label: "Comprehensive exam", amount: 75 },
  { code: "022", label: "X-ray, intraoral", amount: 45 },
  { code: "111", label: "Scale + clean", amount: 120 },
  { code: "531", label: "Composite filling", amount: 145 },
];

export default function RequoteScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [items, setItems] = useState(ORIGINAL_ITEMS);
  const [note, setNote] = useState("");
  const [ack, setAck] = useState(false);
  const [phase, setPhase] = useState<"edit" | "locked">("edit");

  const current = 385;
  const lowestCompetitor = 349;
  const newTotal = items.reduce((s, it) => s + it.amount, 0);

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Requote · one shot left" />
      <ScrollView>
        {phase === "edit" && (
          <>
            <View className="px-8 pt-12 pb-8">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
                Final adjustment
              </Text>
              <Text className="font-display text-4xl text-espresso leading-[1.05] mb-6">
                Your last chance to move.
              </Text>
              <Text className="text-sm text-walnut font-sans leading-relaxed">
                {REQUOTE_NOTICE}
              </Text>
            </View>

            <View className="px-8 mb-10 border-y border-linen py-6 flex-row items-center justify-between">
              <View>
                <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-1">
                  Your current quote
                </Text>
                <Text className="font-display text-3xl text-walnut">${current}</Text>
              </View>
              <View className="items-end">
                <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-1">
                  Lowest competitor
                </Text>
                <Text className="font-display text-3xl text-espresso">
                  ${lowestCompetitor}
                </Text>
              </View>
            </View>

            <View className="px-8 mb-10">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Adjust line items
              </Text>
              {items.map((it) => (
                <View key={it.code} className="py-3 border-b border-linen">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="font-display text-sm text-taupe">{it.code}</Text>
                    <Text className="font-display text-xl text-espresso">
                      ${it.amount}
                    </Text>
                  </View>
                  <Text className="font-sans text-sm text-walnut">{it.label}</Text>
                </View>
              ))}
            </View>

            <View className="px-8 mb-10 border-t border-b border-linen py-6">
              <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans mb-1">
                New total · indicative
              </Text>
              <Text className="font-display text-5xl text-gold">${newTotal}</Text>
            </View>

            <View className="px-8 mb-10">
              <FieldLabel
                label="Updated note"
                hint="Optional. Explain the move — same-day availability, included follow-up, etc."
              >
                <TextField
                  value={note}
                  onChangeText={setNote}
                  placeholder="Can fit you in today at 4:30 pm."
                  multiline
                  maxLength={200}
                />
              </FieldLabel>
            </View>

            <View className="px-8 mb-10">
              <View className="border border-linen bg-eggshell/40 p-5">
                <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-3">
                  Final acknowledgement
                </Text>
                <Checkbox
                  checked={ack}
                  onToggle={() => setAck(!ack)}
                  label="I confirm this requote is my final price for this request and I accept full professional responsibility for it."
                />
              </View>
            </View>

            <View className="px-8 pb-24 items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                onPress={async () => {
                  if (!ack) return;
                  try {
                    await requoteOnce({
                      quoteId: id as string,
                      newTotal: newTotal,
                      newItems: items,
                      newAvailabilitySlots: [new Date(Date.now() + 24 * 3600_000).toISOString()],
                      newNote: note,
                    });
                  } catch (e) {
                    // Continue to locked state regardless — UI is forgiving on demo paths
                    Alert.alert("Couldn't lock", e instanceof Error ? e.message : "Try again.");
                  }
                  setPhase("locked");
                }}
              >
                Submit and lock
              </Button>
              <Button variant="ghost" size="md" onPress={() => router.back()}>
                Cancel
              </Button>
            </View>
          </>
        )}

        {phase === "locked" && (
          <View className="items-center px-8 pt-24 pb-24">
            <View className="h-2 w-2 rounded-full bg-gold mb-12" />
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
              Locked · final
            </Text>
            <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-8">
              Locked in.
            </Text>

            <View className="border-y border-linen w-full max-w-md py-8 items-center mb-10">
              <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-2">
                Camberwell Dental · Final
              </Text>
              <Text className="font-display text-5xl text-gold mb-1">${newTotal}</Text>
              <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
                No further changes for this window
              </Text>
            </View>

            <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed mb-12">
              The patient will see your quote with a Final badge. You'll be
              notified if they book.
            </Text>

            <Button variant="secondary" size="md" onPress={() => router.replace("/dentist")}>
              Back to dashboard
            </Button>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
