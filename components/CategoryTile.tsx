import { Pressable, View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Category, CategoryId } from "@/lib/types";

type Props = { c: Category; onPress?: () => void };

// Modern dental-aesthetic glyphs.
const ICON_FOR: Record<CategoryId, keyof typeof MaterialCommunityIcons.glyphMap> = {
  "filling-clean": "tooth-outline",
  "checkup-clean": "tooth",
  "emergency": "medical-bag",
  "cosmetic": "star-four-points-outline",
  "whitening": "creation",
  "crown-veneer": "crown-outline",
  "implant": "screw-machine-flat-top",
  "wisdom": "tooth-outline",
  "ortho": "vector-line",
  "not-sure": "head-question-outline",
};

export function CategoryTile({ c, onPress }: Props) {
  const iconName = ICON_FOR[c.id] ?? "tooth-outline";
  return (
    <Pressable
      onPress={onPress}
      // Fixed half-width — every tile is the same height regardless of how
      // many sit in the row. flex-1 chaos gone.
      style={{ width: "48.5%" }}
      className="border border-linen bg-eggshell/40 active:bg-eggshell px-5 py-5 mb-3 rounded-md"
    >
      <View className="flex-row items-start justify-between mb-3">
        <MaterialCommunityIcons name={iconName} size={28} color="#5FA89B" />
        <View className="px-2 py-0.5 rounded-full border border-linen">
          <Text className="text-[9px] tracking-cap uppercase text-taupe font-sans">
            {c.symbol}
          </Text>
        </View>
      </View>
      <Text className="font-display text-lg text-espresso mb-1 leading-tight">
        {c.label}
      </Text>
      <Text className="text-xs text-taupe font-sans leading-snug">
        {c.blurb}
      </Text>
    </Pressable>
  );
}
