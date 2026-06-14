import { View, Text } from "react-native";

type Props = { label: string; hint?: string; children: React.ReactNode };

export function FieldLabel({ label, hint, children }: Props) {
  return (
    <View className="mb-8">
      <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-3">
        {label}
      </Text>
      {children}
      {hint ? (
        <Text className="mt-3 text-xs text-taupe font-sans leading-relaxed">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}
