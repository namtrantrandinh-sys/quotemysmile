import { View, Text } from "react-native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

/**
 * Circular Smile Score gauge — replaces the bare 132pt number with a
 * polished ring inspired by modern health-app UI patterns. The ring
 * arc fills proportional to the score (0–10 → 0–1.0 sweep), with the
 * band's accent colour. Score + band chip live in the centre.
 *
 * Mint-first palette: the ring uses a mint gradient for healthy bands,
 * a warm gold for "okay", and a clay tone for "needs_care" so the
 * colour itself communicates the result before the user reads the copy.
 */
type Band = "great" | "good" | "okay" | "needs_care";

const BAND_COLORS: Record<Band, { from: string; to: string; chip: string; chipBg: string }> = {
  great: {
    from: "#7BC5B5",
    to: "#2E7268",
    chip: "#2E7268",
    chipBg: "rgba(95,168,155,0.16)",
  },
  good: {
    from: "#8FD3C2",
    to: "#4F9D8E",
    chip: "#2E7268",
    chipBg: "rgba(95,168,155,0.14)",
  },
  okay: {
    from: "#E6C57A",
    to: "#C9A961",
    chip: "#8A6B22",
    chipBg: "rgba(201,169,97,0.16)",
  },
  needs_care: {
    from: "#C68869",
    to: "#9E5E47",
    chip: "#9E5E47",
    chipBg: "rgba(158,94,71,0.14)",
  },
};

export function SmileScoreGauge({
  score,
  band,
  bandLabel,
  size = 220,
  strokeWidth = 14,
}: {
  score: number;
  band: Band;
  bandLabel: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  // Clamp 0..10 → 0..1
  const pct = Math.max(0, Math.min(1, score / 10));
  const dash = circumference * pct;
  const colors = BAND_COLORS[band];
  const gradId = `smile-grad-${band}`;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.from} />
            <Stop offset="1" stopColor={colors.to} />
          </LinearGradient>
        </Defs>
        {/* Track */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(31,79,71,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Arc — rotated -90deg so it starts at 12 o'clock */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeDashoffset={0}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ alignItems: "center" }}>
        <Text
          style={{
            fontFamily: "Italiana",
            fontSize: Math.round(size * 0.36),
            lineHeight: Math.round(size * 0.38),
            color: "#2A2520",
            includeFontPadding: false,
          }}
        >
          {score.toFixed(1)}
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 9,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: "#8A7E70",
            marginTop: 2,
            fontWeight: "500",
          }}
        >
          out of 10
        </Text>
        <View
          style={{
            marginTop: 10,
            paddingHorizontal: 12,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: colors.chipBg,
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          }}
        >
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: colors.chip,
            }}
          />
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 10.5,
              fontWeight: "600",
              letterSpacing: 0.4,
              color: colors.chip,
            }}
          >
            {bandLabel}
          </Text>
        </View>
      </View>
    </View>
  );
}
