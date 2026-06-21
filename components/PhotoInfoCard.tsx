import { View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Icon, type IconName } from "./Icon";
import { SketchIcon, type SketchIconName } from "./SketchIcon";

type InfoCardProps = {
  // Accepts a legacy Icon name, an MCI glyph, OR a hand-drawn SketchIcon
  // name (Tend post-sign-in look). SketchIcon takes precedence.
  icon: IconName;
  mcIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  sketchIcon?: SketchIconName;
  title: string;
  hint: string;
  tone?: "neutral" | "gold" | "clay";
};

/**
 * Modern guide card — rounded corners, mint accent circle, soft shadow.
 * Sits at the top of capture/location/urgency screens.
 */
export function PhotoInfoCard({
  icon,
  mcIcon,
  sketchIcon,
  title,
  hint,
  tone = "neutral",
}: InfoCardProps) {
  const accent =
    tone === "clay" ? "#9E5E47" : tone === "gold" ? "#5FA89B" : "#5FA89B";
  const accentBg =
    tone === "clay"
      ? "rgba(158,94,71,0.12)"
      : "rgba(95,168,155,0.14)";

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 18,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        shadowColor: "#1F4F47",
        shadowOpacity: 0.08,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
        borderWidth: 1,
        borderColor: "rgba(31,79,71,0.06)",
      }}
    >
      {/* Mint accent circle holding the icon */}
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          backgroundColor: accentBg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {sketchIcon ? (
          <SketchIcon name={sketchIcon} size={26} color={accent} />
        ) : mcIcon ? (
          <MaterialCommunityIcons name={mcIcon} size={24} color={accent} />
        ) : (
          <Icon name={icon} size={26} color={accent} />
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Inter",
            fontWeight: "600",
            fontSize: 14,
            color: "#2A2520",
            marginBottom: 3,
            lineHeight: 19,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 12,
            color: "#6E6457",
            lineHeight: 17,
          }}
        >
          {hint}
        </Text>
      </View>
    </View>
  );
}

type PhotoTipsProps = {
  tips: Array<{
    icon: IconName;
    mcIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
    sketchIcon?: SketchIconName;
    label: string;
    do?: boolean;
  }>;
};

/**
 * Row of small icon-led tips. Now rendered as soft mint chips with
 * rounded corners — matches the rest of the modernised flow.
 */
export function PhotoTips({ tips }: PhotoTipsProps) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 10,
        paddingHorizontal: 24,
        paddingVertical: 16,
      }}
    >
      {tips.map((t, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            backgroundColor: "rgba(95,168,155,0.10)",
            borderRadius: 14,
            paddingVertical: 12,
            paddingHorizontal: 8,
            alignItems: "center",
            gap: 6,
          }}
        >
          {t.sketchIcon ? (
            <SketchIcon
              name={t.sketchIcon}
              size={22}
              color={t.do === false ? "#9E5E47" : "#3F7E73"}
            />
          ) : t.mcIcon ? (
            <MaterialCommunityIcons
              name={t.mcIcon}
              size={20}
              color={t.do === false ? "#9E5E47" : "#5FA89B"}
            />
          ) : (
            <Icon
              name={t.icon}
              size={20}
              color={t.do === false ? "#9E5E47" : "#5FA89B"}
            />
          )}
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 9,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#4D423A",
              textAlign: "center",
              fontWeight: "600",
            }}
          >
            {t.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
