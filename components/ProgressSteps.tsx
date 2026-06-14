import { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";

export type Step = {
  label: string;
  state: "pending" | "active" | "done";
};

type Props = { steps: Step[] };

/**
 * Animated vertical checklist with gold ticks.
 * Used in submitting screen so the patient sees real progress.
 */
export function ProgressSteps({ steps }: Props) {
  return (
    <View className="gap-5 w-full max-w-sm">
      {steps.map((s, i) => (
        <Row key={i} step={s} />
      ))}
    </View>
  );
}

function Row({ step }: { step: Step }) {
  const opacity = useRef(new Animated.Value(step.state === "pending" ? 0.45 : 1)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: step.state === "pending" ? 0.45 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [step.state, opacity]);

  return (
    <Animated.View className="flex-row items-center gap-4" style={{ opacity }}>
      <View
        className={
          step.state === "done"
            ? "h-6 w-6 bg-gold items-center justify-center rounded-full"
            : step.state === "active"
              ? "h-6 w-6 border border-gold rounded-full items-center justify-center"
              : "h-6 w-6 border border-linen rounded-full"
        }
      >
        {step.state === "done" ? (
          <Text className="text-espresso text-xs font-sans">✓</Text>
        ) : step.state === "active" ? (
          <View className="h-2 w-2 bg-gold rounded-full" />
        ) : null}
      </View>
      <Text
        className={
          step.state === "done"
            ? "font-sans text-sm text-espresso"
            : step.state === "active"
              ? "font-sans text-sm text-espresso"
              : "font-sans text-sm text-taupe"
        }
      >
        {step.label}
      </Text>
    </Animated.View>
  );
}
