import { View, Text } from "react-native";

type Props = {
  label?: string;
  title?: string;
  children: React.ReactNode;
};

export function Section({ label, title, children }: Props) {
  return (
    <View className="mb-12">
      {label ? (
        <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
          {label}
        </Text>
      ) : null}
      {title ? (
        <Text className="font-display text-3xl text-espresso mb-6">{title}</Text>
      ) : null}
      {children}
    </View>
  );
}
