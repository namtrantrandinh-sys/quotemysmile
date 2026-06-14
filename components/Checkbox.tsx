import { View, Text, Pressable } from "react-native";
import { cn } from "@/lib/cn";

type Props = {
  checked: boolean;
  onToggle: () => void;
  label: string;
};

export function Checkbox({ checked, onToggle, label }: Props) {
  return (
    <Pressable onPress={onToggle} className="flex-row items-start gap-3 py-2">
      <View
        className={cn(
          "h-5 w-5 items-center justify-center mt-0.5",
          checked ? "bg-gold" : "border border-walnut",
        )}
      >
        {checked ? (
          <Text className="text-espresso text-xs font-sans">✓</Text>
        ) : null}
      </View>
      <Text className="flex-1 text-sm text-walnut font-sans leading-relaxed">
        {label}
      </Text>
    </Pressable>
  );
}
