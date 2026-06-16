import { View, Text } from "react-native";
import type { PhotoSlot } from "@/hooks/usePhotoCapture";
import { ShimmerText } from "./ShimmerText";

type Props = {
  slots: PhotoSlot[];
  activeSlotName?: string;
  compact?: boolean;
};

/**
 * MouthMap — editorial diagram of the 4 capture zones.
 *
 * No SVG dep — built from styled Views. Each zone fades from outline
 * (pending) → gold (captured) → solid gold dot (active).
 *
 *      +-----------------+
 *      |   Upper arch    |     <- arc top
 *      |                 |
 *      |    Front smile  |     <- centre oval
 *      |                 |
 *      |   Lower arch    |     <- arc bottom
 *      +-----------------+
 *           ◯ Problem area     <- small target chip below
 */
export function MouthMap({ slots, activeSlotName, compact }: Props) {
  const front = slots.find((s) => s.name === "front-smile");
  const upper = slots.find((s) => s.name === "upper-arch");
  const lower = slots.find((s) => s.name === "lower-arch");
  const problem = slots.find((s) => s.name === "problem-area");

  const tone = (s?: PhotoSlot) => {
    if (!s) return "border-linen";
    if (s.uri) return "border-gold bg-gold/10";
    if (activeSlotName && s.name === activeSlotName) return "border-gold";
    return "border-linen";
  };

  const dotTone = (s?: PhotoSlot) => {
    if (!s) return "bg-transparent";
    if (s.uri) return "bg-gold";
    if (activeSlotName && s.name === activeSlotName) return "bg-gold/40";
    return "bg-linen";
  };

  const size = compact ? 0.6 : 1;
  const w = 220 * size;
  const archH = 38 * size;
  const ovalH = 56 * size;

  return (
    <View className="items-center">
      <View
        className="items-center justify-center"
        style={{ width: w + 28, height: (archH * 2 + ovalH + 18) }}
      >
        {/* Upper arch — top half-ellipse outline */}
        <View
          className={`border-2 rounded-t-full ${tone(upper)}`}
          style={{
            width: w,
            height: archH,
            borderBottomWidth: 0,
            marginBottom: 4,
          }}
        >
          <View className="absolute inset-0 items-center justify-end" style={{ marginBottom: 4 }}>
            <View className={`h-1.5 w-1.5 rounded-full ${dotTone(upper)}`} />
          </View>
        </View>

        {/* Front smile — central oval */}
        <View
          className={`border-2 rounded-full items-center justify-center ${tone(front)}`}
          style={{ width: w * 0.9, height: ovalH }}
        >
          <View className={`h-1.5 w-1.5 rounded-full ${dotTone(front)}`} />
        </View>

        {/* Lower arch — bottom half-ellipse outline */}
        <View
          className={`border-2 rounded-b-full ${tone(lower)}`}
          style={{
            width: w,
            height: archH,
            borderTopWidth: 0,
            marginTop: 4,
          }}
        >
          <View className="absolute inset-0 items-center" style={{ marginTop: 4 }}>
            <View className={`h-1.5 w-1.5 rounded-full ${dotTone(lower)}`} />
          </View>
        </View>
      </View>

      {/* Problem-area chip below — always shimmers while uncaptured so
          users notice it (it sits below the main mouth diagram and is
          the most easily-missed of the four). */}
      {(() => {
        const isActive = !!problem && !problem.uri;
        const pill = (
          <View
            className={`mt-3 flex-row items-center gap-2 border-2 ${tone(problem)} rounded-full`}
            style={{
              paddingVertical: 4 * size,
              paddingHorizontal: 12 * size,
            }}
          >
            <View className={`h-1.5 w-1.5 rounded-full ${dotTone(problem)}`} />
            <Text
              className="text-[10px] tracking-cap uppercase text-walnut font-sans"
              style={{ fontSize: 10 * size }}
            >
              Problem area
            </Text>
          </View>
        );
        return isActive ? (
          <ShimmerText
            highlight="rgba(95,168,155,0.55)"
            bandWidth={80}
            duration={2400}
          >
            {pill}
          </ShimmerText>
        ) : (
          pill
        );
      })()}

      {!compact ? (
        <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mt-5">
          Mouth scan ·{" "}
          {slots.filter((s) => s.uri).length} of {slots.length} mapped
        </Text>
      ) : null}
    </View>
  );
}
