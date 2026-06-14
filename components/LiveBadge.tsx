import { View, Text } from "react-native";

export function LiveBadge({ label = "LIVE" }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-2">
      <View className="h-1.5 w-1.5 rounded-full bg-forest" />
      <Text className="text-[10px] tracking-editorial uppercase text-walnut font-sans">
        {label}
      </Text>
    </View>
  );
}
