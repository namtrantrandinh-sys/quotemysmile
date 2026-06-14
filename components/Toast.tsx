import { useEffect, useRef } from "react";
import { Animated, Text, View } from "react-native";

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  tone?: "gold" | "forest" | "clay";
};

/**
 * Slide-in toast banner at the top — used for "new quote arrived",
 * "your photo was uploaded", etc.
 *
 * Auto-disappears 3.5s after `visible` becomes true.
 */
export function Toast({ visible, title, subtitle, tone = "gold" }: Props) {
  const translateY = useRef(new Animated.Value(-80)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
      const t = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -80, duration: 240, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 240, useNativeDriver: true }),
        ]).start();
      }, 3500);
      return () => clearTimeout(t);
    }
  }, [visible, translateY, opacity]);

  const dot =
    tone === "forest" ? "bg-forest" : tone === "clay" ? "bg-clay" : "bg-gold";

  return (
    <Animated.View
      pointerEvents="none"
      className="absolute top-12 left-6 right-6 z-50"
      style={{ transform: [{ translateY }], opacity }}
    >
      <View className="bg-bone border border-linen px-5 py-4 flex-row items-center gap-4 shadow-sm">
        <View className={`h-2 w-2 rounded-full ${dot}`} />
        <View className="flex-1">
          <Text className="font-display text-base text-espresso">{title}</Text>
          {subtitle ? (
            <Text className="text-xs text-walnut font-sans mt-1">{subtitle}</Text>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}
