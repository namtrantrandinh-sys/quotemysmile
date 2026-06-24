import { Pressable, View, Text } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SketchIcon, type SketchIconName } from "@/components/SketchIcon";
import type { Category, CategoryId } from "@/lib/types";

type Props = { c: Category; onPress?: () => void };

// Hand-drawn editorial glyph per category. See SketchIcon.tsx for the
// drawn shapes — each one is custom, not a vector-font pictogram.
const ICON_FOR: Record<CategoryId, SketchIconName> = {
  "filling-clean": "tooth",
  "checkup-clean": "tooth-clean",
  "emergency": "emergency",
  "cosmetic": "sparkle",
  "whitening": "whiten",
  "crown-veneer": "crown",
  "implant": "implant",
  "wisdom": "wisdom",
  "ortho": "ortho",
  "not-sure": "question",
};

// Per-category accent palette — each card gets its own soft pastel hue
// so the grid reads as a colourful menu instead of a wall of mint.
// All accents are tonal cousins of mint (no purple, per user direction),
// drawn from a complementary spa palette: peach/coral/gold/sky/sage.
const ACCENT: Record<
  CategoryId,
  { disk: string; ring: string; icon: string; cardTop: string; cardBot: string }
> = {
  "filling-clean": {
    disk: "rgba(95,168,155,0.18)",
    ring: "rgba(95,168,155,0.32)",
    icon: "#2E7268",
    cardTop: "rgba(232,242,235,0.55)",
    cardBot: "#FFFFFF",
  },
  "checkup-clean": {
    disk: "rgba(125,198,180,0.20)",
    ring: "rgba(95,168,155,0.34)",
    icon: "#2E7268",
    cardTop: "rgba(214,238,228,0.55)",
    cardBot: "#FFFFFF",
  },
  "emergency": {
    disk: "rgba(214,128,99,0.22)",
    ring: "rgba(158,94,71,0.38)",
    icon: "#9E5E47",
    cardTop: "rgba(248,224,212,0.55)",
    cardBot: "#FFFFFF",
  },
  "cosmetic": {
    disk: "rgba(232,165,165,0.22)",
    ring: "rgba(216,128,128,0.36)",
    icon: "#B66464",
    cardTop: "rgba(250,228,228,0.55)",
    cardBot: "#FFFFFF",
  },
  "whitening": {
    disk: "rgba(165,200,232,0.22)",
    ring: "rgba(120,170,210,0.40)",
    icon: "#3F7AAE",
    cardTop: "rgba(225,238,250,0.55)",
    cardBot: "#FFFFFF",
  },
  "crown-veneer": {
    disk: "rgba(217,185,118,0.22)",
    ring: "rgba(201,169,97,0.40)",
    icon: "#8A6B22",
    cardTop: "rgba(248,238,212,0.55)",
    cardBot: "#FFFFFF",
  },
  "implant": {
    disk: "rgba(232,194,165,0.22)",
    ring: "rgba(210,156,120,0.40)",
    icon: "#A0623A",
    cardTop: "rgba(250,234,218,0.55)",
    cardBot: "#FFFFFF",
  },
  "wisdom": {
    disk: "rgba(216,152,120,0.22)",
    ring: "rgba(190,118,86,0.40)",
    icon: "#A65A36",
    cardTop: "rgba(248,222,206,0.55)",
    cardBot: "#FFFFFF",
  },
  "ortho": {
    disk: "rgba(122,184,200,0.22)",
    ring: "rgba(84,158,180,0.40)",
    icon: "#1F6E84",
    cardTop: "rgba(214,236,242,0.55)",
    cardBot: "#FFFFFF",
  },
  "not-sure": {
    disk: "rgba(168,158,140,0.22)",
    ring: "rgba(140,128,108,0.40)",
    icon: "#6E6457",
    cardTop: "rgba(240,236,228,0.55)",
    cardBot: "#FFFFFF",
  },
};

/**
 * Service-card category tile — icon CENTERED on top in a generous mint
 * disk, title underneath, subtitle below. Looks like a service card,
 * not a list row, so the categories grid reads as a deliberate menu of
 * options rather than a book of options.
 *
 * iOS Pressable bug guard: backgroundColor + shadow sit on a wrapping
 * View, not the Pressable's function-style — same hoist pattern as the
 * unified Button. Press feedback is delivered via opacity on the
 * Pressable so the card surface never goes invisible.
 */
export function CategoryTile({ c, onPress }: Props) {
  const iconName = ICON_FOR[c.id] ?? "tooth";
  const a = ACCENT[c.id] ?? ACCENT["filling-clean"];
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 22,
        borderWidth: 1,
        borderColor: "rgba(31,79,71,0.07)",
        shadowColor: "#2E7268",
        shadowOpacity: 0.14,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
        elevation: 5,
        overflow: "hidden",
      }}
    >
      <LinearGradient
        colors={[a.cardTop, a.cardBot]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <Pressable
        onPress={onPress}
        android_ripple={{ color: "rgba(31,79,71,0.06)" }}
        style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
      >
        <View
          style={{
            // Fixed height locks every category card in the grid to the
            // same vertical span — was previously `minHeight: 200`, which
            // let cards with longer subtitles (Wisdom tooth, ortho) grow
            // taller than their row-neighbours (Implant, etc.). Equal
            // height was the user's explicit request.
            height: 240,
            paddingVertical: 22,
            paddingHorizontal: 14,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
        {/* Centered icon disk — the visual anchor of the card */}
        <View
          style={{
            width: 62,
            height: 62,
            borderRadius: 31,
            backgroundColor: a.disk,
            borderWidth: 1,
            borderColor: a.ring,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 14,
            shadowColor: a.icon,
            shadowOpacity: 0.16,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <SketchIcon name={iconName} size={34} color={a.icon} noGhost />
        </View>

        {/* Title — centered Inter SemiBold */}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
          style={{
            fontFamily: "Inter",
            fontWeight: "700",
            fontSize: 15,
            color: "#2A2520",
            lineHeight: 19,
            marginBottom: 6,
            textAlign: "center",
            letterSpacing: 0.1,
          }}
        >
          {c.label}
        </Text>

        {/* Subtitle — centered, soft */}
        <Text
          numberOfLines={3}
          style={{
            fontFamily: "Inter",
            fontSize: 11.5,
            color: "#6E6457",
            lineHeight: 16,
            textAlign: "center",
            paddingHorizontal: 4,
          }}
        >
          {c.blurb}
        </Text>

        {/* Roman numeral pill — at bottom, low-emphasis */}
        <View
          style={{
            marginTop: 12,
            paddingHorizontal: 10,
            paddingVertical: 3,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "rgba(31,79,71,0.10)",
            backgroundColor: "rgba(95,168,155,0.06)",
          }}
        >
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 9,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#6E6457",
              fontWeight: "600",
            }}
          >
            {c.symbol}
          </Text>
        </View>
        </View>
      </Pressable>
    </View>
  );
}
