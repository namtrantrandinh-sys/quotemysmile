import { Pressable, Text } from "react-native";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";

type Props = {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  children: string;
  onPress?: () => void;
};

export function Button({ variant = "primary", size = "md", children, onPress }: Props) {
  const sizeCls =
    size === "lg" ? "px-8 py-4" : size === "sm" ? "px-4 py-2" : "px-6 py-3";
  const textSize = size === "lg" ? "text-sm" : size === "sm" ? "text-xs" : "text-sm";

  const containerCls =
    variant === "primary"
      ? "bg-gold active:bg-honey"
      : variant === "secondary"
        ? "bg-transparent border border-espresso active:bg-espresso"
        : "bg-transparent";

  const textCls =
    variant === "primary"
      ? "text-espresso"
      : variant === "secondary"
        ? "text-espresso"
        : "text-walnut";

  return (
    <Pressable
      onPress={onPress}
      className={cn("rounded-sm items-center justify-center", sizeCls, containerCls)}
    >
      <Text className={cn("font-sans uppercase tracking-cap", textSize, textCls)}>
        {children}
      </Text>
    </Pressable>
  );
}
