import { useState, useMemo } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { ProgressDots } from "@/components/ProgressDots";
import { SmileScoreGauge } from "@/components/SmileScoreGauge";
import {
  SMILE_QUESTIONS,
  computeSmileScore,
  saveSmileScore,
  smileScoreBand,
  type SmileAnswer,
} from "@/lib/services/smileScore";

/**
 * Smile Score quiz — 7 risk-factor questions (~45s), runs once on first
 * sign-in or from settings any time after. Risk-weighted self-report
 * grounded in ADA AU oral-health guidance — pain, gum bleeding and
 * smoking carry more weight than flossing. Still NOT a clinical
 * assessment; UI disclaims that twice.
 */
export default function SmileScoreScreen() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const q = SMILE_QUESTIONS[step] ?? null;
  const done = step >= SMILE_QUESTIONS.length;

  const score = useMemo(() => {
    if (!done) return 0;
    const arr: SmileAnswer[] = SMILE_QUESTIONS.map((qq) => ({
      id: qq.id,
      value: answers[qq.id] ?? qq.options[qq.options.length - 1].value,
    }));
    return computeSmileScore(arr);
  }, [done, answers]);

  const band = useMemo(() => smileScoreBand(score), [score]);

  const handlePick = (value: string) => {
    if (!q) return;
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    // Snappy auto-advance — feels fast, no Continue button.
    setTimeout(() => setStep((s) => s + 1), 120);
  };

  const handleSave = async () => {
    setBusy(true);
    try {
      const arr: SmileAnswer[] = SMILE_QUESTIONS.map((qq) => ({
        id: qq.id,
        value: answers[qq.id] ?? qq.options[qq.options.length - 1].value,
      }));
      await saveSmileScore({ answers: arr, score });
      router.replace("/");
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!done) {
    return (
      <SafeAreaView className="flex-1 bg-bone">
        <BackBar
          title="Smile Score"
          right={<ProgressDots step={step + 1} total={SMILE_QUESTIONS.length} />}
        />
        <ScrollView>
          <View className="px-8 pt-12 pb-6 items-center">
            <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-3">
              Question {step + 1} of {SMILE_QUESTIONS.length} · under a minute
            </Text>
            <Text className="font-display text-4xl text-espresso text-center leading-[1.05]">
              {q?.label}
            </Text>
          </View>
          <View className="px-8 pb-24">
            {q?.options.map((opt) => {
              const selected = answers[q.id] === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => handlePick(opt.value)}
                  className={`border ${
                    selected ? "border-espresso bg-eggshell/40" : "border-linen"
                  } px-5 py-5 mb-3`}
                >
                  <Text className="font-display text-xl text-espresso">
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
            <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-6 text-center">
              Soft wellness score · not a clinical assessment
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Reveal — drum-roll, then big number + band copy.
  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Smile Score" />
      <ScrollView>
        <View className="px-8 pt-12 pb-12 items-center">
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-6">
            Your Smile Score
          </Text>
          <SmileScoreGauge
            score={score}
            band={band.band}
            bandLabel={band.label}
            size={240}
          />
          <View className="mt-8 px-6 py-5 items-center w-full max-w-md" style={{ backgroundColor: "rgba(255,255,255,0.6)", borderRadius: 18, borderWidth: 1, borderColor: "rgba(31,79,71,0.08)" }}>
            <Text className="text-sm text-walnut font-sans text-center leading-relaxed">
              {band.hint}
            </Text>
          </View>
          <Text className="text-xs text-taupe font-sans text-center mt-6 max-w-md leading-relaxed">
            Soft wellness score, not a clinical assessment. Your dentist is
            the only one who can give you a clinical opinion.
          </Text>
        </View>
        <View className="px-8 pb-24 items-center gap-3">
          <Button variant="primary" size="lg" onPress={handleSave}>
            {busy ? "Saving…" : "Continue"}
          </Button>
          <Pressable onPress={() => router.replace("/")} hitSlop={10}>
            <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
              Skip for now
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
