import { Pressable, View, Text } from "react-native";
import type { Category } from "@/lib/types";

type Props = { c: Category; onPress?: () => void };

export function CategoryTile({ c, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 min-w-[160px] aspect-square border border-linen bg-eggshell/40 active:bg-eggshell px-6 py-8 justify-between"
    >
      <Text className="font-display text-xl text-gold">{c.symbol}</Text>
      <View>
        <Text className="font-display text-2xl text-espresso mb-1">{c.label}</Text>
        <Text className="text-xs text-taupe font-sans leading-snug">{c.blurb}</Text>
      </View>
    </Pressable>
  );
}
