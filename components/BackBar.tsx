import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Wordmark } from "./Wordmark";

type Props = { title?: string; right?: React.ReactNode };

export function BackBar({ title, right }: Props) {
  const router = useRouter();
  return (
    <View className="px-8 py-6 border-b border-linen flex-row items-center justify-between">
      <Pressable onPress={() => router.back()} hitSlop={12}>
        <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
          ← Back
        </Text>
      </Pressable>
      {title ? (
        <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans">
          {title}
        </Text>
      ) : (
        <Wordmark size="sm" />
      )}
      <View className="min-w-[60px] items-end">{right ?? null}</View>
    </View>
  );
}
