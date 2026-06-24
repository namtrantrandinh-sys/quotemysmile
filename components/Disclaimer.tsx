import { View, Text } from "react-native";

type Props = { variant?: "short" | "medium" };

export function Disclaimer({ variant = "short" }: Props) {
  if (variant === "short") {
    return (
      <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans text-center">
        Guide price · based on your photos
      </Text>
    );
  }
  return (
    <View className="border border-linen bg-eggshell/60 p-5 rounded-sm">
      <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-2">
        About this quote
      </Text>
      <Text className="text-sm leading-relaxed text-walnut font-sans">
        A photo-based guide price from an AHPRA-registered dentist. The clearer
        the photo, the closer the guide. Your final price is confirmed at the
        in-person check-up before any work begins — you'll always see and agree
        the number before going ahead.
      </Text>
    </View>
  );
}
