import { Pressable, View, Text } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import type { Category, CategoryId } from "@/lib/types";

type Props = { c: Category; onPress?: () => void };

// Modern dental-aesthetic glyphs.
const ICON_FOR: Record<CategoryId, keyof typeof MaterialCommunityIcons.glyphMap> = {
  "filling-clean": "tooth-outline",
  "checkup-clean": "tooth",
  "emergency": "medical-bag",
  "cosmetic": "star-four-points-outline",
  "whitening": "creation",
  "crown-veneer": "crown-outline",
  "implant": "screw-machine-flat-top",
  "wisdom": "tooth-outline",
  "ortho": "vector-line",
  "not-sure": "head-question-outline",
};

/**
 * Modern category tile — matches the capture-slot architecture:
 * white surface, soft drop shadow, 18px rounded corners, leading icon
 * in a mint-tinted circle. No more beige eggshell editorial boxes.
 */
export function CategoryTile({ c, onPress }: Props) {
  const iconName = ICON_FOR[c.id] ?? "tooth-outline";
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        width: "48.5%",
        backgroundColor: pressed ? "#F8FAF9" : "#FFFFFF",
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "rgba(31,79,71,0.06)",
        shadowColor: "#1F4F47",
        shadowOpacity: 0.08,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 3,
      })}
    >
      {/* Top row — mint accent icon circle + Roman numeral pill */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <View
          style={{
            width: 42,
            height: 42,
            borderRadius: 21,
            backgroundColor: "rgba(95,168,155,0.14)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={iconName} size={22} color="#5FA89B" />
        </View>
        <View
          style={{
            paddingHorizontal: 8,
            paddingVertical: 2,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(31,79,71,0.10)",
          }}
        >
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 9,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#6E6457",
              fontWeight: "500",
            }}
          >
            {c.symbol}
          </Text>
        </View>
      </View>

      {/* Title — Inter SemiBold (matches the slot tile titles) */}
      <Text
        style={{
          fontFamily: "Inter",
          fontWeight: "600",
          fontSize: 15,
          color: "#2A2520",
          lineHeight: 19,
          marginBottom: 4,
        }}
      >
        {c.label}
      </Text>

      {/* Subtitle */}
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 12,
          color: "#6E6457",
          lineHeight: 16,
        }}
      >
        {c.blurb}
      </Text>
    </Pressable>
  );
}
