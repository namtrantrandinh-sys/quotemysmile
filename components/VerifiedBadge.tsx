import { View, Text } from "react-native";

type Props = { ahpraNo?: string; size?: "sm" | "md" };

export function VerifiedBadge({ ahpraNo, size = "sm" }: Props) {
  const dot = size === "md" ? "h-2 w-2" : "h-1.5 w-1.5";
  const text =
    size === "md" ? "text-xs tracking-cap" : "text-[10px] tracking-editorial";
  return (
    <View className="flex-row items-center gap-2">
      <View className={`${dot} rounded-full bg-gold`} />
      <Text className={`${text} uppercase text-walnut font-sans`}>
        Verified{ahpraNo ? ` · AHPRA ${ahpraNo.slice(-4)}` : ""}
      </Text>
    </View>
  );
}
