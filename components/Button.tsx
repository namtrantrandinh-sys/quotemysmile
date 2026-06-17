import { Pressable, Text, View, type ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

/**
 * Unified button architecture.
 *
 * Variants
 *   primary    Mint pill, white text, soft shadow. The main CTA.
 *   secondary  Outlined espresso pill, transparent fill.
 *   tonal      Soft mint tint pill (low-emphasis action, e.g. "Resend").
 *   ghost      Plain text button, no surface.
 *   destructive Clay pill, white text.
 *
 * Sizes
 *   sm  / md (default) / lg
 *
 * Icons
 *   leftIcon  / rightIcon — MaterialCommunityIcons glyph name
 *
 * All variants are pill-shaped (rounded-full) for a consistent modern feel.
 */
type Variant = "primary" | "secondary" | "tonal" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

type Props = {
  variant?: Variant;
  size?: Size;
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  leftIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  rightIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  fullWidth?: boolean;
};

const MINT = "#5FA89B";
const MINT_DEEP = "#1F4F47";
const ESPRESSO = "#2A2520";
const CLAY = "#9E5E47";
const TAUPE = "#6E6457";
// Primary CTA surface — deep teal, not mint. White text on mint
// (#5FA89B) measures ~2.1:1 (AA fail) and disappears over the mint
// banner used on the welcome + sign-in screens. Deep teal #1F4F47
// against white text measures ~10:1 (AAA) and is already in palette.
const PRIMARY_BG = MINT_DEEP;
const PRIMARY_BG_PRESSED = "#173B35";

const SIZE_SPEC: Record<
  Size,
  { px: number; py: number; iconSize: number; fontSize: number; gap: number }
> = {
  sm: { px: 18, py: 9, iconSize: 16, fontSize: 11, gap: 6 },
  md: { px: 22, py: 12, iconSize: 18, fontSize: 13, gap: 8 },
  lg: { px: 28, py: 16, iconSize: 20, fontSize: 14, gap: 10 },
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  onPress,
  disabled,
  leftIcon,
  rightIcon,
  fullWidth,
}: Props) {
  const spec = SIZE_SPEC[size];

  // Per-variant style + colour map.
  const v = (() => {
    switch (variant) {
      case "primary":
        return {
          bg: PRIMARY_BG,
          activeBg: PRIMARY_BG_PRESSED,
          text: "#FFFFFF",
          iconColor: "#FFFFFF",
          shadow: true,
          borderWidth: 0,
          borderColor: "transparent",
        };
      case "secondary":
        return {
          bg: "transparent",
          activeBg: "rgba(42,37,32,0.08)",
          text: ESPRESSO,
          iconColor: ESPRESSO,
          shadow: false,
          borderWidth: 1.5,
          borderColor: ESPRESSO,
        };
      case "tonal":
        return {
          bg: "rgba(95,168,155,0.16)",
          activeBg: "rgba(95,168,155,0.28)",
          text: "#3F7E73",
          iconColor: "#3F7E73",
          shadow: false,
          borderWidth: 0,
          borderColor: "transparent",
        };
      case "destructive":
        return {
          bg: CLAY,
          activeBg: "#854C39",
          text: "#FFFFFF",
          iconColor: "#FFFFFF",
          shadow: true,
          borderWidth: 0,
          borderColor: "transparent",
        };
      case "ghost":
      default:
        return {
          bg: "transparent",
          activeBg: "transparent",
          text: TAUPE,
          iconColor: TAUPE,
          shadow: false,
          borderWidth: 0,
          borderColor: "transparent",
        };
    }
  })();

  const containerStyle: ViewStyle = {
    backgroundColor: v.bg,
    borderRadius: 999,
    paddingHorizontal: spec.px,
    paddingVertical: spec.py,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spec.gap,
    borderWidth: v.borderWidth,
    borderColor: v.borderColor,
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : "auto",
    ...(v.shadow
      ? {
          shadowColor: MINT_DEEP,
          shadowOpacity: 0.22,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 5 },
          elevation: 6,
        }
      : {}),
  };

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed && !disabled ? { backgroundColor: v.activeBg } : null,
      ]}
    >
      {leftIcon ? (
        <MaterialCommunityIcons
          name={leftIcon}
          size={spec.iconSize}
          color={v.iconColor}
        />
      ) : null}
      <Text
        style={{
          fontFamily: "Inter",
          color: v.text,
          fontSize: spec.fontSize,
          letterSpacing: 1.4,
          textTransform: "uppercase",
          fontWeight: "600",
        }}
      >
        {children}
      </Text>
      {rightIcon ? (
        <MaterialCommunityIcons
          name={rightIcon}
          size={spec.iconSize}
          color={v.iconColor}
        />
      ) : null}
    </Pressable>
  );
}

/**
 * Tile button — full-width white-surface row used in lists. The new
 * structural primitive for the capture slot rows + similar.
 */
export function TileButton({
  leftSlot,
  title,
  subtitle,
  kicker,
  trailing,
  onPress,
  emphasis,
}: {
  leftSlot?: React.ReactNode;
  title: string;
  subtitle?: string;
  kicker?: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  emphasis?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? "#FAFAFA" : "#FFFFFF",
        borderRadius: 18,
        paddingVertical: 16,
        paddingHorizontal: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        borderWidth: 1,
        borderColor: emphasis ? "rgba(95,168,155,0.45)" : "rgba(31,79,71,0.08)",
        shadowColor: MINT_DEEP,
        shadowOpacity: emphasis ? 0.14 : 0.06,
        shadowRadius: emphasis ? 14 : 8,
        shadowOffset: { width: 0, height: emphasis ? 6 : 3 },
        elevation: emphasis ? 4 : 2,
      })}
    >
      {leftSlot}
      <View style={{ flex: 1 }}>
        {kicker ? (
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 9,
              color: TAUPE,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 2,
              fontWeight: "500",
            }}
          >
            {kicker}
          </Text>
        ) : null}
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 15,
            color: ESPRESSO,
            fontWeight: "600",
            lineHeight: 19,
            marginBottom: subtitle ? 2 : 0,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 12,
              color: TAUPE,
              lineHeight: 16,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {trailing}
    </Pressable>
  );
}
