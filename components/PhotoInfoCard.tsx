import { View, Text } from "react-native";
import { Icon, type IconName } from "./Icon";

type Props = {
  icon: IconName;
  title: string;
  hint: string;
  tone?: "neutral" | "gold" | "clay";
};

/**
 * Editorial guide card — sits at the top of capture/location/urgency screens.
 * Icon hero + title + supporting hint. Cream surface, hairline border.
 */
export function PhotoInfoCard({ icon, title, hint, tone = "neutral" }: Props) {
  const borderClass =
    tone === "gold"
      ? "border-gold/40 bg-gold/5"
      : tone === "clay"
        ? "border-clay/40 bg-clay/5"
        : "border-linen bg-eggshell/40";

  return (
    <View className={`border ${borderClass} px-5 py-6 flex-row gap-4 items-center`}>
      <View>
        <Icon name={icon} size={42} color={tone === "clay" ? "#9E5E47" : "#C9A961"} />
      </View>
      <View className="flex-1">
        <Text className="font-display text-lg text-espresso mb-1">{title}</Text>
        <Text className="text-xs text-walnut font-sans leading-relaxed">{hint}</Text>
      </View>
    </View>
  );
}

type PhotoTipsProps = {
  tips: Array<{ icon: IconName; label: string; do?: boolean }>;
};

/**
 * Row of small icon-led tips ("Daylight · Hold still · Front-facing")
 * used as a footer / belt across the bottom of capture-ish screens.
 */
export function PhotoTips({ tips }: PhotoTipsProps) {
  return (
    <View className="flex-row justify-around px-4 py-5 border-y border-linen bg-eggshell/30">
      {tips.map((t, i) => (
        <View key={i} className="items-center gap-2">
          <Icon name={t.icon} size={26} color={t.do === false ? "#9E5E47" : "#C9A961"} />
          <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans text-center">
            {t.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
