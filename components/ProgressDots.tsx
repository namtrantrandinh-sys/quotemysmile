import { View } from "react-native";
import { cn } from "@/lib/cn";

type Props = { step: number; total: number };

export function ProgressDots({ step, total }: Props) {
  return (
    <View className="flex-row items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={cn(
            "h-1.5 rounded-full",
            i < step ? "w-6 bg-gold" : "w-1.5 bg-linen",
          )}
        />
      ))}
    </View>
  );
}
