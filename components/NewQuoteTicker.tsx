import { useEffect, useRef, useState } from "react";
import { Animated, View, Text, Pressable, Easing } from "react-native";

export type TickerItem = {
  id: string;
  dentistName: string;
  clinicName?: string;
  total: number;
  arrivedAt: number;
};

type Props = {
  items: TickerItem[];
  onPress?: (id: string) => void;
};

/**
 * Slim animated banner that surfaces the freshest quote.
 * Fades + slides in when a new item lands, holds for ~5s, then drifts away.
 * Used at the top of the live feed.
 */
export function NewQuoteTicker({ items, onPress }: Props) {
  const [current, setCurrent] = useState<TickerItem | null>(null);
  const slide = useRef(new Animated.Value(-32)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  const latestId = items[0]?.id ?? null;

  useEffect(() => {
    if (!latestId) return;
    const next = items[0];
    setCurrent(next);

    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 280,
        useNativeDriver: true,
      }),
    ]).start();

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    const exit = setTimeout(() => {
      Animated.parallel([
        Animated.timing(slide, {
          toValue: -32,
          duration: 320,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          toValue: 0,
          duration: 280,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          pulseLoop.stop();
          setCurrent((c) => (c?.id === next.id ? null : c));
        }
      });
    }, 5000);

    return () => {
      clearTimeout(exit);
      pulseLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestId]);

  if (!current) return null;

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 1],
  });

  return (
    <Animated.View
      style={{
        opacity: fade,
        transform: [{ translateY: slide }],
      }}
    >
      <Pressable
        onPress={() => onPress?.(current.id)}
        className="mx-8 mt-2 mb-1 border border-gold/40 bg-gold/8 px-5 py-3 flex-row items-center"
      >
        <Animated.View
          style={{ opacity: pulseOpacity }}
          className="h-1.5 w-1.5 rounded-full bg-gold mr-3"
        />
        <View className="flex-1">
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans">
            New quote · just now
          </Text>
          <Text className="font-display text-lg text-espresso mt-0.5">
            {current.dentistName}
            {current.clinicName ? (
              <Text className="text-sm text-walnut font-sans">
                {" "}
                · {current.clinicName}
              </Text>
            ) : null}
          </Text>
        </View>
        <View className="items-end ml-3">
          <Text className="font-display text-xl text-gold">${current.total}</Text>
          <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-0.5">
            View ›
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
