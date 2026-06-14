import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { cn } from "@/lib/cn";

type Props = {
  width?: number | string;
  height?: number;
  rounded?: boolean;
  className?: string;
};

/**
 * Editorial skeleton — pulses softly between linen and eggshell.
 * Use for cards, lines, or any loading placeholder.
 */
export function Skeleton({ width = "100%", height = 16, rounded, className }: Props) {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      className={cn(rounded ? "rounded-full" : "rounded-sm", className)}
      style={{
        width: width as any,
        height,
        backgroundColor: "#E5DCC8",
        opacity,
      }}
    />
  );
}

/** Multi-line skeleton block. */
export function SkeletonBlock({ lines = 3 }: { lines?: number }) {
  return (
    <View className="gap-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={12} width={i === lines - 1 ? "60%" : "100%"} />
      ))}
    </View>
  );
}
