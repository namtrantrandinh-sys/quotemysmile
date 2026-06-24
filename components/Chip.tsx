import { Pressable, Text } from "react-native";
import { cn } from "@/lib/cn";

type Props = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
};

export function Chip({ label, selected, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "px-5 py-3 rounded-sm border",
        selected ? "border-espresso bg-espresso" : "border-linen bg-transparent",
      )}
      style={{ minHeight: 40, alignItems: "center", justifyContent: "center" }}
    >
      <Text
        className={cn(
          "text-[11px] tracking-cap uppercase font-sans",
          selected ? "text-bone" : "text-walnut",
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}
