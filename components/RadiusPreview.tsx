import { View, Text } from "react-native";

type Props = { radiusKm: number; suburb?: string };

/**
 * Editorial "rings" preview of the dentist service radius.
 * No map dependency — pure SVG-feel via overlapping bordered circles.
 */
export function RadiusPreview({ radiusKm, suburb }: Props) {
  const max = 30;
  const pct = Math.min(1, radiusKm / max);
  return (
    <View className="border border-linen bg-eggshell/40 p-8 items-center">
      <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-4">
        Service area
      </Text>
      <View
        className="rounded-full border border-linen items-center justify-center mb-2"
        style={{ width: 200, height: 200 }}
      >
        <View
          className="rounded-full border border-gold/40 items-center justify-center"
          style={{ width: 200 * pct, height: 200 * pct, minWidth: 50, minHeight: 50 }}
        >
          <View className="h-2 w-2 rounded-full bg-gold" />
        </View>
      </View>
      <Text className="font-display text-3xl text-gold">{radiusKm} km</Text>
      {suburb ? (
        <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mt-2">
          from {suburb}
        </Text>
      ) : null}
    </View>
  );
}
