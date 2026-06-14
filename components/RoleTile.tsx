import { Pressable, Text, View } from "react-native";

type Props = {
  symbol: string;
  label: string;
  blurb: string;
  onPress: () => void;
};

/**
 * Editorial role-picker tile — used on welcome screen to direct
 * users to patient vs dentist flows.
 */
export function RoleTile({ symbol, label, blurb, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 border border-linen bg-eggshell/30 px-6 py-8 active:bg-eggshell"
    >
      <Text className="font-display text-2xl text-gold mb-6">{symbol}</Text>
      <Text className="font-display text-2xl text-espresso mb-2">{label}</Text>
      <Text className="text-xs text-taupe font-sans leading-relaxed">{blurb}</Text>
    </Pressable>
  );
}
