import { useRef, useState } from "react";
import { View, Text, PanResponder, LayoutChangeEvent } from "react-native";

type Props = {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  labels?: [string, string]; // [left, right]
};

/**
 * Editorial horizontal slider with discrete snap.
 * Used for pain level, shade goal, etc.
 */
export function Slider({ value, onChange, min = 0, max = 5, step = 1, labels }: Props) {
  const [trackWidth, setTrackWidth] = useState(280);
  const startX = useRef(0);
  const range = max - min;
  const pct = (value - min) / range;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        startX.current = e.nativeEvent.locationX;
        const clamped = Math.max(0, Math.min(trackWidth, e.nativeEvent.locationX));
        const next = Math.round((clamped / trackWidth) * range / step) * step + min;
        onChange(next);
      },
      onPanResponderMove: (_e, g) => {
        const px = Math.max(0, Math.min(trackWidth, startX.current + g.dx));
        const next = Math.round((px / trackWidth) * range / step) * step + min;
        onChange(next);
      },
    }),
  ).current;

  const onLayout = (e: LayoutChangeEvent) => {
    setTrackWidth(e.nativeEvent.layout.width);
  };

  return (
    <View>
      <View
        onLayout={onLayout}
        {...responder.panHandlers}
        className="h-12 justify-center"
      >
        <View className="h-[3px] bg-linen rounded-full w-full" />
        <View
          className="absolute h-[3px] bg-gold rounded-full"
          style={{ width: `${pct * 100}%` }}
        />
        <View
          className="absolute h-6 w-6 rounded-full bg-gold border-4 border-bone"
          style={{ left: `${pct * 100}%`, marginLeft: -12 }}
        />
      </View>
      {labels ? (
        <View className="flex-row justify-between mt-1">
          <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
            {labels[0]}
          </Text>
          <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
            {labels[1]}
          </Text>
        </View>
      ) : null}
      <View className="flex-row justify-between mt-3">
        {Array.from({ length: range / step + 1 }).map((_, i) => {
          const v = min + i * step;
          return (
            <Text
              key={v}
              className={
                v === value
                  ? "font-display text-2xl text-gold"
                  : "font-display text-base text-taupe"
              }
            >
              {v}
            </Text>
          );
        })}
      </View>
    </View>
  );
}
