import Svg, { Path, Circle, G } from "react-native-svg";

type Props = {
  variant: "upper" | "lower";
  size?: number;
  color?: string;
};

/**
 * Anatomical upper/lower dental arch icons drawn as SVG so we have
 * something visually distinct — MaterialCommunityIcons doesn't ship a
 * proper "arch opening down" vs "arch opening up" pair.
 *
 * Each icon shows a horseshoe of small tooth marks following the curve
 * of the arch. Upper has the opening facing down, Lower faces up.
 */
export function ArchIcon({ variant, size = 28, color = "#5FA89B" }: Props) {
  // Path is drawn in a 32×32 viewBox. We flip vertically for the lower
  // variant via a transform so the source of truth is one curve.
  const isUpper = variant === "upper";
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <G transform={isUpper ? undefined : "scale(1, -1) translate(0, -32)"}>
        {/* Outer arch curve — horseshoe, opening downward */}
        <Path
          d="M 5 9 Q 5 24 16 24 Q 27 24 27 9"
          stroke={color}
          strokeWidth={1.8}
          fill="none"
          strokeLinecap="round"
        />
        {/* Inner arch curve — gum line */}
        <Path
          d="M 9 11 Q 9 20 16 20 Q 23 20 23 11"
          stroke={color}
          strokeWidth={1.2}
          fill="none"
          strokeLinecap="round"
          opacity={0.55}
        />
        {/* Individual tooth dots positioned along the outer arc.
            Six teeth, symmetric, spaced around the curve. */}
        {[
          { cx: 6.5, cy: 11.5 },
          { cx: 8.3, cy: 17.5 },
          { cx: 12.0, cy: 21.5 },
          { cx: 20.0, cy: 21.5 },
          { cx: 23.7, cy: 17.5 },
          { cx: 25.5, cy: 11.5 },
        ].map((p, i) => (
          <Circle key={i} cx={p.cx} cy={p.cy} r={1.6} fill={color} />
        ))}
      </G>
    </Svg>
  );
}
