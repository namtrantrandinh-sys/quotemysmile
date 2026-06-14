import { useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { FieldLabel } from "@/components/FieldLabel";
import { TextField } from "@/components/TextField";
import { ProgressDots } from "@/components/ProgressDots";
import { Slider } from "@/components/Slider";
import { getCategory } from "@/lib/categories";
import { setIntake } from "@/lib/intakeStore";

const DURATIONS = [
  { id: "lt-1wk", label: "Less than a week" },
  { id: "1-4wks", label: "1–4 weeks" },
  { id: "gt-1mo", label: "More than a month" },
];

const TRIGGERS = [
  { id: "hot-cold", label: "Hot / cold" },
  { id: "chewing", label: "Chewing" },
  { id: "sweet", label: "Sweet" },
  { id: "spontaneous", label: "Spontaneous" },
  { id: "pressure", label: "Pressure" },
  { id: "night", label: "At night" },
];

const SHADES = ["A1", "A2", "A3", "A3.5", "A4"];
const METHODS = [
  { id: "in-chair", label: "In-chair" },
  { id: "tray", label: "Take-home tray" },
  { id: "combo", label: "Combination" },
  { id: "unsure", label: "Let dentist advise" },
];
const WORK = [
  { id: "front-crowns", label: "Front crowns / veneers" },
  { id: "front-fillings", label: "Front fillings" },
  { id: "sensitive", label: "Sensitive teeth" },
  { id: "recent-ortho", label: "Recent ortho" },
  { id: "none", label: "None" },
];

export default function SymptomsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ c?: string }>();
  const category = getCategory(params.c ?? "");
  const isWhitening = category?.id === "whitening";

  // Standard
  const [duration, setDuration] = useState<string | null>(null);
  const [pain, setPain] = useState(2);
  const [triggers, setTriggers] = useState<Set<string>>(new Set());
  const [note, setNote] = useState("");

  // Health fund (optional, all categories)
  const [fundProvider, setFundProvider] = useState("");
  const [fundLevel, setFundLevel] = useState("");
  const [fundLast4, setFundLast4] = useState("");

  // Whitening
  const [currentShade, setCurrentShade] = useState("A3");
  const [goalShade, setGoalShade] = useState("A1");
  const [method, setMethod] = useState("unsure");
  const [work, setWork] = useState<Set<string>>(new Set());
  const [whiteningNote, setWhiteningNote] = useState("");

  function toggle(set: Set<string>, key: string, setter: (s: Set<string>) => void) {
    const next = new Set(set);
    next.has(key) ? next.delete(key) : next.add(key);
    setter(next);
  }

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar
        title="Step 03 · Details"
        right={<ProgressDots step={3} total={6} />}
      />
      <ScrollView>
        <View className="px-8 pt-16 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            {category?.label ?? "Tell us more"}
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-6">
            {isWhitening ? "About your whitening." : "What's going on."}
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            {isWhitening
              ? "Outcomes vary — your dentist will advise what's safe and realistic."
              : "Quick details so dentists can quote accurately from your photos."}
          </Text>
        </View>

        <View className="px-8 pb-24">
          {isWhitening ? (
            <>
              <FieldLabel label="Current shade" hint="Use the VITA-style guide. Slide to your closest match.">
                <View className="flex-row flex-wrap gap-2">
                  {SHADES.map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      selected={currentShade === s}
                      onPress={() => setCurrentShade(s)}
                    />
                  ))}
                </View>
              </FieldLabel>

              <FieldLabel label="Goal shade" hint="Realistic outcomes depend on your enamel and any existing dental work.">
                <View className="flex-row flex-wrap gap-2">
                  {SHADES.map((s) => (
                    <Chip
                      key={s}
                      label={s}
                      selected={goalShade === s}
                      onPress={() => setGoalShade(s)}
                    />
                  ))}
                </View>
              </FieldLabel>

              <FieldLabel label="Preferred method">
                <View className="flex-row flex-wrap gap-2">
                  {METHODS.map((m) => (
                    <Chip
                      key={m.id}
                      label={m.label}
                      selected={method === m.id}
                      onPress={() => setMethod(m.id)}
                    />
                  ))}
                </View>
              </FieldLabel>

              <FieldLabel label="Existing dental work" hint="Crowns, veneers and fillings do not change shade.">
                <View className="flex-row flex-wrap gap-2">
                  {WORK.map((w) => (
                    <Chip
                      key={w.id}
                      label={w.label}
                      selected={work.has(w.id)}
                      onPress={() => toggle(work, w.id, setWork)}
                    />
                  ))}
                </View>
              </FieldLabel>

              <FieldLabel label="Anything else" hint="Optional. Event in mind? Specific concern?">
                <TextField
                  value={whiteningNote}
                  onChangeText={setWhiteningNote}
                  placeholder="Wedding in 3 months. Want to brighten before photos."
                  multiline
                  maxLength={280}
                />
              </FieldLabel>
            </>
          ) : (
            <>
              <FieldLabel label="How long?">
                <View className="flex-row flex-wrap gap-2">
                  {DURATIONS.map((d) => (
                    <Chip
                      key={d.id}
                      label={d.label}
                      selected={duration === d.id}
                      onPress={() => setDuration(d.id)}
                    />
                  ))}
                </View>
              </FieldLabel>

              <FieldLabel label="Pain level" hint={`${pain} of 5 — drag the dot to adjust.`}>
                <Slider
                  value={pain}
                  onChange={setPain}
                  min={0}
                  max={5}
                  labels={["No pain", "Severe"]}
                />
              </FieldLabel>

              <FieldLabel label="Triggers (pick any)">
                <View className="flex-row flex-wrap gap-2">
                  {TRIGGERS.map((t) => (
                    <Chip
                      key={t.id}
                      label={t.label}
                      selected={triggers.has(t.id)}
                      onPress={() => toggle(triggers, t.id, setTriggers)}
                    />
                  ))}
                </View>
              </FieldLabel>

              <FieldLabel label="Anything else" hint="Optional.">
                <TextField
                  value={note}
                  onChangeText={setNote}
                  placeholder="Chip on front tooth from biting an apple. Sharp edge."
                  multiline
                  maxLength={280}
                />
              </FieldLabel>
            </>
          )}

          {/* Health fund — optional, helps the quote estimate out-of-pocket */}
          <View className="border-t border-linen mt-10 pt-10">
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
              Health fund · optional
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-6">
              We use this only to estimate your out-of-pocket on the quote
              screen. Your member number is never shared with dentists.
            </Text>

            <FieldLabel label="Provider">
              <TextField
                value={fundProvider}
                onChangeText={setFundProvider}
                placeholder="Bupa, HCF, Medibank, NIB…"
              />
            </FieldLabel>

            <FieldLabel label="Extras level">
              <TextField
                value={fundLevel}
                onChangeText={setFundLevel}
                placeholder="Top Extras, Mid Extras…"
              />
            </FieldLabel>

            <FieldLabel
              label="Member number · last 4"
              hint="Last 4 digits only. Used so the clinic can pre-check your rebate."
            >
              <TextField
                value={fundLast4}
                onChangeText={setFundLast4}
                placeholder="1234"
                keyboardType="numeric"
                maxLength={4}
              />
            </FieldLabel>
          </View>

          <View className="items-center mt-8">
            <Button
              variant="primary"
              size="lg"
              onPress={() => {
                const symptomJson = isWhitening
                  ? {
                      currentShade,
                      goalShade,
                      method,
                      existingWork: Array.from(work),
                      note: whiteningNote,
                    }
                  : {
                      duration,
                      pain,
                      triggers: Array.from(triggers),
                      note,
                    };
                const healthFund = fundProvider
                  ? {
                      provider: fundProvider.trim(),
                      level: fundLevel.trim() || null,
                      member_id_last4: fundLast4.trim() || null,
                    }
                  : {};
                setIntake({ symptomJson, healthFund });
                router.push({ pathname: "/location", params: { c: params.c } });
              }}
            >
              Continue
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
