import { View, Text } from "react-native";

type Props = { variant?: "short" | "medium" };

export function Disclaimer({ variant = "short" }: Props) {
  if (variant === "short") {
    return (
      <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans text-center">
        Indicative · based on photos
      </Text>
    );
  }
  return (
    <View className="border border-linen bg-eggshell/60 p-5 rounded-sm">
      <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-2">
        About this quote
      </Text>
      <Text className="text-sm leading-relaxed text-walnut font-sans">
        This quote is indicative, based on the photos and information you provided.
        The clearer the photo, the more accurate the quote. Final fees and treatment
        are the responsibility of the quoting dentist and confirmed at your
        clinical examination.
      </Text>
    </View>
  );
}
