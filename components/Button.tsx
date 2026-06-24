import { Pressable, Text, View, type ViewStyle } from "react-native";
import { SketchIcon, type SketchIconName } from "@/components/SketchIcon";

/**
 * Unified button architecture.
 *
 * Variants
 *   primary    Deep-teal rounded-rect, white text, whisper-soft shadow.
 *   secondary  Hairline-outlined espresso rect, transparent fill.
 *   tonal      Soft mint tint rect (low-emphasis action, e.g. "Resend").
 *   ghost      Plain text button, no surface.
 *   destructive Clay rounded-rect, white text.
 *
 * Sizes
 *   sm  / md (default) / lg
 *
 * Icons
 *   leftSketch / rightSketch — hand-drawn SketchIcon glyph name. The
 *   Tend-editorial look is the only icon language on QMS post-OTA #10;
 *   the legacy MaterialCommunityIcons props were removed when the
 *   patient/dentist split landed.
 *
 * Tend Dental aesthetic: rounded-rect (~14pt), sentence-case copy with
 * gentle tracking, breathing vertical padding, low-opacity shadow. No pills.
 */
type Variant = "primary" | "secondary" | "tonal" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

type Props = {
  variant?: Variant;
  size?: Size;
  children: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Hand-drawn sketch glyph — leading slot. */
  leftSketch?: SketchIconName;
  /** Hand-drawn sketch glyph — trailing slot. */
  rightSketch?: SketchIconName;
  fullWidth?: boolean;
};

const MINT = "#5FA89B";
const MINT_DEEP = "#2E7268";
const ESPRESSO = "#2A2520";
const CLAY = "#9E5E47";
const TAUPE = "#6E6457";
// Per user revert: primary buttons are SOLID mint (no gradient, no
// crystal layers). Replaces the brief "crystal glassy" + linear
// gradient experiment. Keep MINT as the canonical primary surface.
const PRIMARY_BG = MINT;
const PRIMARY_BG_PRESSED = "#4A8B7F";

// Size contract (after the "words too close to the button board" pass):
//  • Generous px + py — labels NEVER kiss the pill edge
//  • minHeight keeps the surface visually substantial
//  • minWidth keeps short labels ("Add", "Continue") from looking pill-tiny
//  • adjustsFontSizeToFit + flexShrink on Text → long labels shrink to fit
//    instead of overflowing the wrapper (replaces the old maxWidth crop
//    that was visibly cutting "Try again" at the rounded corners).
const SIZE_SPEC: Record<
  Size,
  {
    px: number;
    py: number;
    iconSize: number;
    fontSize: number;
    gap: number;
    minHeight: number;
    minWidth: number;
  }
> = {
  // Bumped px substantially — labels were sitting too close to the
  // pill border ("words too close to the button board"). minWidth
  // ensures even short labels like "Add" get a substantial surface.
  sm: { px: 26, py: 14, iconSize: 16, fontSize: 13, gap: 8, minHeight: 46, minWidth: 110 },
  md: { px: 34, py: 18, iconSize: 18, fontSize: 15, gap: 10, minHeight: 56, minWidth: 160 },
  lg: { px: 40, py: 22, iconSize: 20, fontSize: 16, gap: 12, minHeight: 64, minWidth: 200 },
};

export function Button({
  variant = "primary",
  size = "md",
  children,
  onPress,
  disabled,
  leftSketch,
  rightSketch,
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
          text: "#2E7268",
          iconColor: "#2E7268",
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

  // Background colour sits on a WRAPPER View so iOS Pressable's
  // function-style can't drop it (the bug that previously made
  // "SEND SIGN-IN CODE" render as invisible white-on-cream).
  // Press feedback is delivered via opacity on the inner Pressable.
  //
  // Solid fill — no gradient, no crystal/glass overlay layers, per
  // user revert. minWidth keeps short labels from shrinking; fullWidth
  // still spans the available parent width.
  const wrapperStyle: ViewStyle = {
    backgroundColor: v.bg,
    borderRadius: 16,
    borderWidth: v.borderWidth,
    borderColor: v.borderColor,
    opacity: disabled ? 0.5 : 1,
    alignSelf: fullWidth ? "stretch" : "center",
    minWidth: fullWidth ? undefined : spec.minWidth,
    overflow: "hidden",
    ...(v.shadow
      ? {
          shadowColor: MINT_DEEP,
          shadowOpacity: 0.18,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 5,
        }
      : {}),
  };

  const innerStyle: ViewStyle = {
    paddingHorizontal: spec.px,
    paddingVertical: spec.py,
    minHeight: spec.minHeight,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spec.gap,
  };

  return (
    <View style={wrapperStyle}>
      {/* Pressable owns ONLY the press handler + opacity feedback.
          Layout (padding/flexDirection/alignItems/gap/minHeight) is on
          the stable child <View> below — iOS was intermittently dropping
          those properties when set inside Pressable's function-style,
          which collapsed row layouts to column. See TileButton for the
          full incident write-up. */}
      <Pressable
        onPress={disabled ? undefined : onPress}
        android_ripple={
          v.bg !== "transparent"
            ? { color: "rgba(255,255,255,0.18)" }
            : { color: "rgba(31,79,71,0.08)" }
        }
        style={({ pressed }) => ({
          opacity: pressed && !disabled ? 0.82 : 1,
        })}
      >
        <View style={innerStyle}>
        {leftSketch ? (
          <SketchIcon
            name={leftSketch}
            size={spec.iconSize + 2}
            color={v.iconColor}
            strokeWidth={1.5}
            noGhost
          />
        ) : null}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.78}
          style={{
            // Centred via textAlign AND container flex-row +
            // justifyContent:center. adjustsFontSizeToFit is back
            // (with a sensible floor) so long labels like
            // "Capture Upper arch" / "Send SMS code" gracefully
            // shrink instead of overflowing the pill edge.
            textAlign: "center",
            fontFamily: "Inter",
            color: v.text,
            fontSize: spec.fontSize,
            lineHeight: spec.fontSize + 4,
            letterSpacing: 0.2,
            fontWeight: "600",
            includeFontPadding: false,
            textAlignVertical: "center",
            // flexShrink lets the Text yield space to icons when
            // present, so the row still fits in fullWidth pills.
            flexShrink: 1,
          }}
        >
          {children}
        </Text>
        {rightSketch ? (
          <SketchIcon
            name={rightSketch}
            size={spec.iconSize + 2}
            color={v.iconColor}
            strokeWidth={1.5}
            noGhost
          />
        ) : null}
        </View>
      </Pressable>
    </View>
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
  // Layout MUST sit on a stable style object. Previous fix only hoisted
  // backgroundColor; flexDirection:"row" was still inside Pressable's
  // function-style — and iOS was intermittently dropping it, which
  // collapsed the row to column (icon top → text middle → Add button
  // wrapping full-width centred below). User feedback after seeing it
  // on a real phone vs the preview: "PHOTO 1 OF 4 ... buttons are thin
  // and distorted ... MAKE THE PHONE VIEW LOOK LIKE THE PREVIEW VIEW".
  //
  // Fix: row layout lives in a plain View *inside* the Pressable, and
  // the Pressable itself owns nothing but the press handler. The plain
  // View's style is a stable object so RN can't drop it. Press feedback
  // moves to `opacity` via Pressable's function-style — opacity is one
  // of the few styles iOS never drops because it's animated separately.
  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: emphasis ? "rgba(95,168,155,0.45)" : "rgba(31,79,71,0.08)",
        shadowColor: MINT_DEEP,
        shadowOpacity: emphasis ? 0.14 : 0.06,
        shadowRadius: emphasis ? 14 : 8,
        shadowOffset: { width: 0, height: emphasis ? 6 : 3 },
        elevation: emphasis ? 4 : 2,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={onPress}
        android_ripple={{ color: "rgba(31,79,71,0.06)" }}
        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
      >
        <View
          style={{
            paddingVertical: 16,
            paddingHorizontal: 16,
            flexDirection: "row",
            alignItems: "center",
            gap: 14,
          }}
        >
          {leftSlot}
          <View style={{ flex: 1, minWidth: 0 }}>
            {kicker ? (
              <Text
                numberOfLines={1}
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
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
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
                numberOfLines={2}
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
          {/* Trailing slot kept on its own column with flexShrink:0 so
              a long subtitle in the middle never pushes the Add button
              off the row or onto a new line. */}
          {trailing ? (
            <View style={{ flexShrink: 0 }}>{trailing}</View>
          ) : null}
        </View>
      </Pressable>
    </View>
  );
}
