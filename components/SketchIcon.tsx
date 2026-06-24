import Svg, { Path, G, Circle, Line, Rect } from "react-native-svg";
import { View } from "react-native";

/**
 * SketchIcon — hand-drawn editorial glyph library for post-sign-in QMS.
 *
 * Why a custom library instead of MaterialCommunityIcons:
 *   The post-sign-in scope follows the Tend Dental aesthetic — quiet,
 *   editorial, hand-illustrated. Generic web-font glyphs (MCI) read as
 *   "product UI", which fights the cream/serif tone we lock at sign-in.
 *   These icons are drawn as SVG strokes with a faint pencil-underdraw
 *   ghost stroke so each glyph reads as ink on cream, not pixel pictogram.
 *
 * Aesthetic rules:
 *   • 24×24 viewBox, stroke-width 1.4 (default), round linecap & linejoin
 *   • Ghost-stroke pass — each path drawn twice: once at low opacity with
 *     a sub-pixel offset (sells the pencil-underdraw feel), once full.
 *   • No fills except for tiny "ink dot" marks (sparkles, eyes, jewels).
 *   • Strokes intentionally don't always close — open corners read as
 *     drawn-by-hand, not extruded by a path tool.
 *   • Default colour: deep mint #2E7268 (matches Tend's botanical green).
 *
 * Use sparingly: ONE hero illustration per screen header, smaller inline
 * marks in row tiles. Avoid filling whole grids with this style — the
 * sketch feel needs whitespace to breathe.
 */

const COLOR_DEFAULT = "#2E7268";
const STROKE_DEFAULT = 1.4;
const GHOST_OPACITY = 0.22;
const GHOST_DX = 0.7;
const GHOST_DY = 0.6;

export type SketchIconName =
  | "home"
  | "bookings"
  | "camera"
  | "tooth"
  | "tooth-clean"
  | "emergency"
  | "sparkle"
  | "whiten"
  | "crown"
  | "implant"
  | "wisdom"
  | "ortho"
  | "question"
  | "chevron-right"
  | "plus"
  | "check"
  | "arrow-right"
  | "leaf"
  | "smile"
  | "magnify"
  | "verified"
  | "chevron-left"
  | "sun"
  | "hand-still"
  | "frame"
  | "camera-flip"
  | "clock"
  | "radius"
  | "shield"
  | "lock"
  | "calendar"
  | "info"
  | "scan"
  | "mouth"
  | "chat"
  | "list"
  | "map"
  | "map-pin"
  | "phone"
  | "inbox"
  | "sign-out";

type Props = {
  name: SketchIconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  /** Skip the pencil-underdraw ghost pass (use for tiny inline marks ≤16px) */
  noGhost?: boolean;
};

export function SketchIcon({
  name,
  size = 28,
  color = COLOR_DEFAULT,
  strokeWidth = STROKE_DEFAULT,
  noGhost,
}: Props) {
  const body = renderGlyph(name, color, strokeWidth);
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {!noGhost ? (
          <G
            opacity={GHOST_OPACITY}
            transform={`translate(${GHOST_DX}, ${GHOST_DY})`}
          >
            {body}
          </G>
        ) : null}
        {body}
      </Svg>
    </View>
  );
}

function renderGlyph(name: SketchIconName, c: string, sw: number) {
  // Common stroke props — round caps + round joins are what sell the
  // pencil look (squared caps make every line look like a steel pen).
  const stroke = {
    stroke: c,
    strokeWidth: sw,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none" as const,
  };

  switch (name) {
    case "home":
      // Pitched-roof house with the right wall slightly taller than the
      // left (asymmetric on purpose — a perfect rectangle reads CAD,
      // not sketched). Tiny dot for the door handle.
      return (
        <G>
          <Path
            d="M3.6 11.4 L12 4.1 L20.5 11.6"
            {...stroke}
          />
          <Path
            d="M5.4 10.8 L5.4 19.6 L18.7 19.6 L18.7 11.1"
            {...stroke}
          />
          <Path
            d="M10 19.5 L10 14.6 L14 14.6 L14 19.5"
            {...stroke}
          />
          <Circle cx={13.3} cy={17.2} r={0.45} fill={c} />
        </G>
      );

    case "bookings":
      // Open booklet with a folded top-right corner + two short ruled
      // lines + a tiny date-marker dot at top right.
      return (
        <G>
          <Path
            d="M4.6 5.4 L16.4 5.4 L19.4 8.3 L19.4 19.2 L4.6 19.2 Z"
            {...stroke}
          />
          <Path d="M16.4 5.4 L16.4 8.3 L19.4 8.3" {...stroke} />
          <Path d="M7.6 12.2 L14.6 12.2" {...stroke} />
          <Path d="M7.6 15.2 L12.4 15.2" {...stroke} />
          <Circle cx={17.4} cy={6.8} r={0.5} fill={c} />
        </G>
      );

    case "camera":
      // Vintage camera body — rounded-rect with a soft top hump (lens
      // hood), big lens circle with concentric inner ring + dot, tiny
      // shutter mark top-right.
      return (
        <G>
          <Path
            d="M3.6 9.2 Q3.6 7.7 5.1 7.7 L7.2 7.7 L8.4 5.9 L15.6 5.9 L16.8 7.7 L18.9 7.7 Q20.4 7.7 20.4 9.2 L20.4 17.4 Q20.4 18.9 18.9 18.9 L5.1 18.9 Q3.6 18.9 3.6 17.4 Z"
            {...stroke}
          />
          <Circle cx={12} cy={13.4} r={3.5} {...stroke} />
          <Circle cx={12} cy={13.4} r={1.5} {...stroke} />
          <Circle cx={17.6} cy={9.6} r={0.5} fill={c} />
        </G>
      );

    case "tooth":
      // Tend-style: one confident continuous tooth silhouette, no extras.
      // The "filling + clean" semantic comes from one small leaf-tip mark
      // (Tend's botanical signature) on the upper-left — keeps it living,
      // not clinical. Centred in viewBox so it reads at any size.
      return (
        <G>
          <Path
            d="M8.4 5.6 Q12 4.0 15.6 5.6 Q17.6 7.2 17.0 10.6 Q16.4 13.6 15.2 16.6 Q14.4 19.4 13.2 19.4 Q12.4 19.4 12.1 16.8 Q12.0 15.2 11.9 16.8 Q11.6 19.4 10.8 19.4 Q9.6 19.4 8.8 16.6 Q7.6 13.6 7.0 10.6 Q6.4 7.2 8.4 5.6 Z"
            {...stroke}
          />
          {/* Tiny leaf glint — Tend botanical mark, sits on the crown */}
          <Path d="M10.4 8.6 Q11.6 7.4 13.0 8.6" {...stroke} opacity={0.6} />
        </G>
      );

    case "tooth-clean":
      // Tend-style: tooth + one slim leaf arcing off the upper-right.
      // The leaf is Tend's botanical signature — replaces both the
      // dated bubbles and the previous sparkle. Reads as "fresh, living,
      // post-clean" without shouting.
      return (
        <G>
          <Path
            d="M7.6 8.4 Q12 6.8 16.4 8.4 Q18.2 9.8 17.4 13.0 Q16.8 15.8 15.6 18.6 Q14.8 21.0 13.4 21.0 Q12.6 21.0 12.2 18.4 Q12 16.6 11.8 18.4 Q11.4 21.0 10.6 21.0 Q9.2 21.0 8.4 18.6 Q7.2 15.8 6.6 13.0 Q5.8 9.8 7.6 8.4 Z"
            {...stroke}
          />
          {/* Leaf — single almond-shape stroke + stem curving into the tooth */}
          <Path
            d="M16.4 3.2 Q19.6 3.8 19.2 6.6 Q17.2 7.4 15.8 5.8 Q15.4 4.4 16.4 3.2 Z"
            {...stroke}
          />
          <Path d="M15.8 5.8 Q15.0 7.0 14.6 8.4" {...stroke} opacity={0.7} />
        </G>
      );

    case "emergency":
      // Soft squircle with rounded medical cross + three radiating
      // sparks at the top (urgency without alarm bells).
      return (
        <G>
          <Path
            d="M5.4 10.0 Q5.4 7.6 7.8 7.6 L16.2 7.6 Q18.6 7.6 18.6 10.0 L18.6 17.2 Q18.6 19.6 16.2 19.6 L7.8 19.6 Q5.4 19.6 5.4 17.2 Z"
            {...stroke}
          />
          <Path d="M12 10.4 L12 16.4" {...stroke} />
          <Path d="M9.0 13.4 L15.0 13.4" {...stroke} />
          <Path d="M9.4 5.0 L8.4 3.4" {...stroke} opacity={0.7} />
          <Path d="M12 4.8 L12 2.8" {...stroke} opacity={0.7} />
          <Path d="M14.6 5.0 L15.6 3.4" {...stroke} opacity={0.7} />
        </G>
      );

    case "sparkle":
      // Four-pointed editorial star with a tiny echo diamond floating
      // off the upper-right.
      return (
        <G>
          <Path
            d="M12 3.6 L13.4 10.6 L20.4 12 L13.4 13.4 L12 20.4 L10.6 13.4 L3.6 12 L10.6 10.6 Z"
            {...stroke}
          />
          <Path
            d="M18.6 5.8 L19.2 7.6 L21.0 8.2 L19.2 8.8 L18.6 10.6 L18.0 8.8 L16.2 8.2 L18.0 7.6 Z"
            {...stroke}
            opacity={0.65}
          />
        </G>
      );

    case "whiten":
      // Tend-style: tooth haloed by THREE soft curved arcs (not rays).
      // Curves feel botanical/breath-like instead of mechanical sun-rays.
      // Each arc widens outward — quiet escalation, balanced both sides.
      return (
        <G>
          <Path
            d="M8.4 8.6 Q12 7.0 15.6 8.6 Q17.4 10.0 16.6 13.2 Q16.0 15.6 15.0 18.4 Q14.4 21.0 13.4 21.0 Q12.6 21.0 12.2 18.4 Q12.0 16.6 11.8 18.4 Q11.4 21.0 10.6 21.0 Q9.6 21.0 9.0 18.4 Q8.0 15.6 7.4 13.2 Q6.6 10.0 8.4 8.6 Z"
            {...stroke}
          />
          {/* Soft curved halo — three nested arcs above the tooth */}
          <Path d="M9.4 5.6 Q12 4.4 14.6 5.6" {...stroke} opacity={0.85} />
          <Path d="M7.8 3.4 Q12 1.4 16.2 3.4" {...stroke} opacity={0.55} />
        </G>
      );

    case "crown":
      // Tend-style: a single graceful dental crown — soft dome with a
      // gentle rounded baseline. No notch lines, no jewel dot, no second
      // tooth-shape below. The whole glyph IS the crown, breathing in
      // generous whitespace.
      return (
        <G>
          {/* Crown silhouette — dome with rounded baseline and tapered sides */}
          <Path
            d="M5.6 16.6 Q5.4 9.6 12 5.4 Q18.6 9.6 18.4 16.6 Q12 17.6 5.6 16.6 Z"
            {...stroke}
          />
          {/* Baseline shelf — single arc, suggests where crown meets gum */}
          <Path
            d="M5.6 16.6 Q12 18.4 18.4 16.6"
            {...stroke}
            opacity={0.7}
          />
          {/* Faint inner highlight — one quiet curve, no jewels */}
          <Path d="M9.4 9.8 Q12 8.4 14.6 9.8" {...stroke} opacity={0.5} />
        </G>
      );

    case "implant":
      // Dome on top with a threaded screw shaft below — drawn as a
      // hand-zigzag, not a perfect spiral.
      return (
        <G>
          <Path
            d="M8.6 7.4 Q8.6 4.4 12 4.4 Q15.4 4.4 15.4 7.4 L15.4 8.6 L8.6 8.6 Z"
            {...stroke}
          />
          <Path d="M9.2 8.6 L9.2 18.4 L12 20.6 L14.8 18.4 L14.8 8.6" {...stroke} />
          <Path d="M9.6 10.6 L14.4 10.6" {...stroke} opacity={0.7} />
          <Path d="M9.6 12.8 L14.4 12.8" {...stroke} opacity={0.7} />
          <Path d="M9.6 15.0 L14.4 15.0" {...stroke} opacity={0.7} />
        </G>
      );

    case "wisdom":
      // Back-molar with two bumpy crown humps + short stubby roots.
      return (
        <G>
          <Path
            d="M6.4 7.4 Q8 5.8 10.2 6.6 Q12 5.4 13.8 6.6 Q16 5.8 17.6 7.4 Q18.4 10.4 17.4 13.4 Q16.6 18.4 15.4 18.6 Q14.6 18.6 14.2 16.0 Q14 14.6 13.6 16.0 Q12.8 18.6 12 18.6 Q11.2 18.6 10.4 16.0 Q10 14.6 9.8 16.0 Q9.4 18.6 8.6 18.6 Q7.4 18.4 6.6 13.4 Q5.6 10.4 6.4 7.4 Z"
            {...stroke}
          />
          <Path
            d="M9.4 9.6 Q12 8.4 14.6 9.6"
            {...stroke}
            opacity={0.55}
          />
        </G>
      );

    case "ortho":
      // Arch wire with three small bracket squares — orthodontic glyph.
      return (
        <G>
          <Path
            d="M3.6 9.4 Q12 17.4 20.4 9.4"
            {...stroke}
          />
          <Path d="M6.6 11.2 L6.6 13.6 L8.2 13.6 L8.2 11.2 Z" {...stroke} />
          <Path d="M11.0 13.2 L11.0 15.6 L13.0 15.6 L13.0 13.2 Z" {...stroke} />
          <Path d="M15.8 11.2 L15.8 13.6 L17.4 13.6 L17.4 11.2 Z" {...stroke} />
          <Path d="M3.6 9.4 L6.6 12.4" {...stroke} opacity={0.45} />
          <Path d="M8.2 12.4 L11.0 14.4" {...stroke} opacity={0.45} />
          <Path d="M13.0 14.4 L15.8 12.4" {...stroke} opacity={0.45} />
          <Path d="M17.4 12.4 L20.4 9.4" {...stroke} opacity={0.45} />
        </G>
      );

    case "question":
      // Tilted question mark inside a soft squircle — off-axis on
      // purpose so it reads as someone scribbled it, not auto-aligned.
      return (
        <G>
          <Path
            d="M5.0 9.6 Q5.0 5.0 9.6 5.0 L14.4 5.0 Q19.0 5.0 19.0 9.6 L19.0 14.4 Q19.0 19.0 14.4 19.0 L9.6 19.0 Q5.0 19.0 5.0 14.4 Z"
            {...stroke}
          />
          <Path
            d="M9.6 10.4 Q9.6 7.8 12.2 7.8 Q14.8 7.8 14.6 10.0 Q14.4 11.6 12.4 12.2 Q11.6 12.4 11.8 13.6"
            {...stroke}
          />
          <Circle cx={11.8} cy={16.0} r={0.55} fill={c} />
        </G>
      );

    case "chevron-right":
      // Hand-drawn > — two strokes meeting at a slightly soft joint,
      // tapered ends.
      return (
        <G>
          <Path d="M9.4 6.0 L15.4 12 L9.4 18.0" {...stroke} />
        </G>
      );

    case "plus":
      // Cross with rounded tips. Slight asymmetry — the vertical is
      // 0.2px taller than the horizontal is wide.
      return (
        <G>
          <Path d="M12 5.4 L12 18.6" {...stroke} />
          <Path d="M5.6 12 L18.4 12" {...stroke} />
        </G>
      );

    case "check":
      // Long-tailed check with a tiny pencil-start dot before the
      // descender.
      return (
        <G>
          <Path d="M4.6 12.8 L9.4 17.6 L19.4 7.0" {...stroke} />
          <Circle cx={4.4} cy={12.6} r={0.4} fill={c} />
        </G>
      );

    case "arrow-right":
      // Shaft + open arrowhead that doesn't quite close on the spine.
      return (
        <G>
          <Path d="M4.0 12 L19.4 12" {...stroke} />
          <Path d="M14.4 6.8 L19.6 12 L14.4 17.2" {...stroke} />
        </G>
      );

    case "leaf":
      // Botanical leaf — Tend's signature lifestyle motif. Stem +
      // teardrop blade + a midrib hairline.
      return (
        <G>
          <Path
            d="M5.4 18.6 Q5.4 10.4 12.4 6.4 Q19.4 4.4 18.6 11.4 Q17.8 18.4 9.4 18.6 Z"
            {...stroke}
          />
          <Path
            d="M5.4 18.6 Q11.4 13.4 17.6 9.4"
            {...stroke}
            opacity={0.55}
          />
        </G>
      );

    case "smile":
      // Upturned mouth with a tiny tooth glint dot — used for the
      // "front smile" capture slot. Not a circle-emoji; just a drawn
      // smile curve with a corner dimple.
      return (
        <G>
          <Path
            d="M5.4 10.8 Q12 18.6 18.6 10.8"
            {...stroke}
          />
          <Path
            d="M6.4 10.6 Q12 13.0 17.6 10.6"
            {...stroke}
            opacity={0.55}
          />
          <Circle cx={9.4} cy={13.4} r={0.45} fill={c} />
          <Circle cx={14.6} cy={13.4} r={0.45} fill={c} />
        </G>
      );

    case "magnify":
      // Hand-drawn loupe — circle + tilted handle that doesn't quite
      // meet the rim (drawn-by-hand feel).
      return (
        <G>
          <Circle cx={10.4} cy={10.4} r={5.6} {...stroke} />
          <Path d="M14.6 14.4 L19.2 19.0" {...stroke} />
          <Path
            d="M7.6 8.4 Q9.0 7.0 11.0 7.2"
            {...stroke}
            opacity={0.55}
          />
        </G>
      );

    case "verified":
      // Scalloped seal (AHPRA-registered glyph) with an inset check.
      // Eight-petalled rather than ten-petalled MCI decagram — drawn
      // by hand with slightly off-axis bumps.
      return (
        <G>
          <Path
            d="M12 3.6 L13.6 5.0 L15.6 4.6 L16.4 6.6 L18.4 7.2 L18.0 9.2 L19.4 10.8 L18.0 12.4 L18.4 14.4 L16.4 15.0 L15.6 17.0 L13.6 16.6 L12 18.0 L10.4 16.6 L8.4 17.0 L7.6 15.0 L5.6 14.4 L6.0 12.4 L4.6 10.8 L6.0 9.2 L5.6 7.2 L7.6 6.6 L8.4 4.6 L10.4 5.0 Z"
            {...stroke}
          />
          <Path
            d="M8.6 10.8 L10.8 13.0 L15.4 8.4"
            {...stroke}
          />
        </G>
      );

    case "chevron-left":
      return (
        <G>
          <Path d="M14.6 6.0 L8.6 12 L14.6 18.0" {...stroke} />
        </G>
      );

    case "sun":
      // Editorial sun — irregular ray lengths, off-centre disc dot.
      return (
        <G>
          <Circle cx={12} cy={12} r={3.6} {...stroke} />
          <Path d="M12 3.4 L12 5.4" {...stroke} />
          <Path d="M12 18.6 L12 20.6" {...stroke} />
          <Path d="M3.4 12 L5.4 12" {...stroke} />
          <Path d="M18.6 12 L20.6 12" {...stroke} />
          <Path d="M5.6 5.6 L7.2 7.2" {...stroke} opacity={0.7} />
          <Path d="M16.8 16.8 L18.4 18.4" {...stroke} opacity={0.7} />
          <Path d="M5.6 18.4 L7.2 16.8" {...stroke} opacity={0.7} />
          <Path d="M16.8 7.2 L18.4 5.6" {...stroke} opacity={0.7} />
          <Circle cx={11.4} cy={11.6} r={0.4} fill={c} />
        </G>
      );

    case "hand-still":
      // Open palm + a small motion-pause echo above (still / steady).
      return (
        <G>
          <Path
            d="M8.4 14.4 L8.4 8.4 Q8.4 7.4 9.4 7.4 Q10.4 7.4 10.4 8.4 L10.4 11.4 L10.4 6.4 Q10.4 5.4 11.4 5.4 Q12.4 5.4 12.4 6.4 L12.4 11.0 L12.4 6.8 Q12.4 5.8 13.4 5.8 Q14.4 5.8 14.4 6.8 L14.4 11.2 L14.4 8.4 Q14.4 7.4 15.4 7.4 Q16.4 7.4 16.4 8.4 L16.4 14.6 Q16.4 18.6 12.4 18.6 Q8.4 18.6 8.4 14.4 Z"
            {...stroke}
          />
          <Path d="M4.6 5.6 L6.4 5.6" {...stroke} opacity={0.55} />
          <Path d="M4.4 8.6 L5.6 8.6" {...stroke} opacity={0.55} />
        </G>
      );

    case "frame":
      // Crop-frame brackets — four open corners, no full rectangle.
      return (
        <G>
          <Path d="M4.6 8.6 L4.6 4.6 L8.6 4.6" {...stroke} />
          <Path d="M19.4 8.6 L19.4 4.6 L15.4 4.6" {...stroke} />
          <Path d="M4.6 15.4 L4.6 19.4 L8.6 19.4" {...stroke} />
          <Path d="M19.4 15.4 L19.4 19.4 L15.4 19.4" {...stroke} />
          <Circle cx={12} cy={12} r={0.6} fill={c} />
        </G>
      );

    case "clock":
      // Wonky clock — dial circle + an off-axis hour-hand and slightly
      // longer minute-hand. Tiny 12-o'clock tick.
      return (
        <G>
          <Circle cx={12} cy={12} r={7.4} {...stroke} />
          <Path d="M12 12 L12 7.4" {...stroke} opacity={0.55} />
          <Path d="M12 12 L15.2 13.6" {...stroke} />
          <Path d="M12 7.4 L12 8.6" {...stroke} />
          <Circle cx={12} cy={12} r={0.6} fill={c} />
        </G>
      );

    case "radius":
      // Three concentric ringed pulses + centre dot — sketched search
      // radius / "where to scan" glyph.
      return (
        <G>
          <Circle cx={12} cy={12} r={7.4} {...stroke} opacity={0.35} />
          <Circle cx={12} cy={12} r={4.8} {...stroke} opacity={0.6} />
          <Circle cx={12} cy={12} r={2.2} {...stroke} />
          <Circle cx={12} cy={12} r={0.7} fill={c} />
        </G>
      );

    case "shield":
      // Heraldic shield — squared shoulders, tapered point, faint
      // central tick (trust mark).
      return (
        <G>
          <Path
            d="M12 3.4 L19.0 5.4 Q19.0 14.4 12 20.4 Q5.0 14.4 5.0 5.4 Z"
            {...stroke}
          />
          <Path
            d="M8.6 11.6 L11.0 14.0 L15.6 9.4"
            {...stroke}
            opacity={0.75}
          />
        </G>
      );

    case "lock":
      // Padlock — shackle that doesn't quite seat into the body
      // (drawn-by-hand), body with a vertical keyway slot.
      return (
        <G>
          <Path
            d="M8.4 10.4 L8.4 7.8 Q8.4 5.0 12 5.0 Q15.6 5.0 15.6 7.8 L15.6 10.4"
            {...stroke}
          />
          <Path
            d="M6.4 10.6 L17.6 10.6 Q18.4 10.6 18.4 11.4 L18.4 18.4 Q18.4 19.4 17.4 19.4 L6.6 19.4 Q5.6 19.4 5.6 18.4 L5.6 11.4 Q5.6 10.6 6.4 10.6 Z"
            {...stroke}
          />
          <Path d="M12 13.4 L12 16.4" {...stroke} />
          <Circle cx={12} cy={13.2} r={0.55} fill={c} />
        </G>
      );

    case "calendar":
      // Notebook calendar — binder slots at top, grid baseline, one
      // ink dot marking today.
      return (
        <G>
          <Path
            d="M5.4 6.6 L18.6 6.6 Q19.4 6.6 19.4 7.4 L19.4 19.0 Q19.4 19.8 18.6 19.8 L5.4 19.8 Q4.6 19.8 4.6 19.0 L4.6 7.4 Q4.6 6.6 5.4 6.6 Z"
            {...stroke}
          />
          <Path d="M4.6 10.4 L19.4 10.4" {...stroke} />
          <Path d="M8.4 4.4 L8.4 8.0" {...stroke} />
          <Path d="M15.6 4.4 L15.6 8.0" {...stroke} />
          <Circle cx={9.4} cy={13.8} r={0.45} fill={c} opacity={0.6} />
          <Circle cx={12} cy={13.8} r={0.55} fill={c} />
          <Circle cx={14.6} cy={13.8} r={0.45} fill={c} opacity={0.6} />
          <Circle cx={9.4} cy={16.6} r={0.45} fill={c} opacity={0.6} />
          <Circle cx={12} cy={16.6} r={0.45} fill={c} opacity={0.6} />
        </G>
      );

    case "info":
      // Circle with offset "i" — dot up top, descender below.
      return (
        <G>
          <Circle cx={12} cy={12} r={7.6} {...stroke} />
          <Circle cx={12} cy={8.6} r={0.6} fill={c} />
          <Path d="M12 10.8 L12 16.4" {...stroke} />
        </G>
      );

    case "scan":
      // Open scanner brackets with a centre rule line (face-scan glyph).
      return (
        <G>
          <Path d="M4.6 8.6 L4.6 4.6 L8.6 4.6" {...stroke} />
          <Path d="M19.4 8.6 L19.4 4.6 L15.4 4.6" {...stroke} />
          <Path d="M4.6 15.4 L4.6 19.4 L8.6 19.4" {...stroke} />
          <Path d="M19.4 15.4 L19.4 19.4 L15.4 19.4" {...stroke} />
          <Path d="M6.4 12 L17.6 12" {...stroke} opacity={0.55} />
          <Circle cx={9.6} cy={9.4} r={0.45} fill={c} />
          <Circle cx={14.6} cy={9.4} r={0.45} fill={c} />
          <Path d="M9.6 14.6 Q12 16.4 14.6 14.6" {...stroke} />
        </G>
      );

    case "mouth":
      // Open mouth — upper + lower lip arcs with a centre rule.
      return (
        <G>
          <Path
            d="M4.4 12 Q12 6.4 19.6 12"
            {...stroke}
          />
          <Path
            d="M4.4 12 Q12 17.6 19.6 12"
            {...stroke}
          />
          <Path d="M6.6 12 L17.4 12" {...stroke} opacity={0.45} />
          <Circle cx={12} cy={9.4} r={0.5} fill={c} />
        </G>
      );

    case "chat":
      // Speech bubble with a soft pointer + three ink dots.
      return (
        <G>
          <Path
            d="M4.6 6.6 L17.4 6.6 Q19.4 6.6 19.4 8.6 L19.4 14.4 Q19.4 16.4 17.4 16.4 L11.4 16.4 L7.4 19.4 L8.4 16.4 L6.6 16.4 Q4.6 16.4 4.6 14.4 Z"
            {...stroke}
          />
          <Circle cx={9.4} cy={11.4} r={0.5} fill={c} />
          <Circle cx={12} cy={11.4} r={0.5} fill={c} />
          <Circle cx={14.6} cy={11.4} r={0.5} fill={c} />
        </G>
      );

    case "list":
      // Hand-drawn bullets + lines that aren't perfectly parallel.
      return (
        <G>
          <Circle cx={6.4} cy={7.4} r={0.7} fill={c} />
          <Path d="M9.4 7.4 L19.0 7.4" {...stroke} />
          <Circle cx={6.4} cy={12} r={0.7} fill={c} />
          <Path d="M9.4 12 L18.6 12" {...stroke} />
          <Circle cx={6.4} cy={16.6} r={0.7} fill={c} />
          <Path d="M9.4 16.6 L17.4 16.6" {...stroke} />
        </G>
      );

    case "map":
      // Folded map — two vertical creases and a wandering route line.
      return (
        <G>
          <Path
            d="M4.4 6.4 L9.0 4.6 L15.0 6.4 L19.6 4.6 L19.6 17.6 L15.0 19.4 L9.0 17.6 L4.4 19.4 Z"
            {...stroke}
          />
          <Path d="M9.0 4.6 L9.0 17.6" {...stroke} opacity={0.5} />
          <Path d="M15.0 6.4 L15.0 19.4" {...stroke} opacity={0.5} />
          <Path d="M6.6 14.6 Q10.0 11.6 13.6 13.4 Q16.6 14.6 17.6 9.6" {...stroke} />
        </G>
      );

    case "map-pin":
      // Teardrop pin — open top + jewel-dot centre + base shadow ellipse.
      return (
        <G>
          <Path
            d="M12 3.6 Q18 3.6 18 9.6 Q18 13.4 12 20.4 Q6 13.4 6 9.6 Q6 3.6 12 3.6 Z"
            {...stroke}
          />
          <Circle cx={12} cy={9.6} r={2.2} {...stroke} />
          <Circle cx={12} cy={9.6} r={0.6} fill={c} />
        </G>
      );

    case "phone":
      // Slab phone with handset curve + small earpiece dot.
      return (
        <G>
          <Path
            d="M8.4 3.6 L15.6 3.6 Q16.6 3.6 16.6 4.6 L16.6 19.4 Q16.6 20.4 15.6 20.4 L8.4 20.4 Q7.4 20.4 7.4 19.4 L7.4 4.6 Q7.4 3.6 8.4 3.6 Z"
            {...stroke}
          />
          <Path d="M10.4 5.4 L13.6 5.4" {...stroke} opacity={0.7} />
          <Circle cx={12} cy={18.0} r={0.7} fill={c} />
        </G>
      );

    case "camera-flip":
      // Camera body with two arrows looping around it — flip motion.
      return (
        <G>
          <Path
            d="M5.4 10.6 Q5.4 9.4 6.6 9.4 L8.0 9.4 L9.0 7.8 L15.0 7.8 L16.0 9.4 L17.4 9.4 Q18.6 9.4 18.6 10.6 L18.6 16.4 Q18.6 17.6 17.4 17.6 L6.6 17.6 Q5.4 17.6 5.4 16.4 Z"
            {...stroke}
          />
          <Path d="M9.6 13.4 Q10.6 11.6 12.4 11.6 Q14.0 11.6 14.4 12.6" {...stroke} />
          <Path d="M14.4 10.8 L14.6 12.8 L12.6 13.0" {...stroke} />
          <Path d="M14.4 13.6 Q13.4 15.4 11.6 15.4 Q10.0 15.4 9.6 14.4" {...stroke} />
          <Path d="M9.6 16.2 L9.4 14.2 L11.4 14.0" {...stroke} />
        </G>
      );

    case "inbox":
      // Tray with a small arrow descending into it — clearly distinct
      // from "chat" (used for active conversation threads).
      return (
        <G>
          <Path
            d="M4.2 14.4 L4.2 18.2 Q4.2 19.4 5.4 19.4 L18.6 19.4 Q19.8 19.4 19.8 18.2 L19.8 14.4 L15.6 14.4 L14.6 16.0 L9.4 16.0 L8.4 14.4 Z"
            {...stroke}
          />
          <Path d="M6.4 14.4 L6.4 5.6 Q6.4 4.6 7.4 4.6 L16.6 4.6 Q17.6 4.6 17.6 5.6 L17.6 14.4" {...stroke} />
          <Path d="M12 7.4 L12 12.4" {...stroke} />
          <Path d="M10 10.4 L12 12.4 L14 10.4" {...stroke} />
        </G>
      );

    case "sign-out":
      // Door frame with arrow exiting to the right — "leave the app".
      return (
        <G>
          <Path
            d="M11.4 4.4 L5.4 4.4 Q4.4 4.4 4.4 5.4 L4.4 18.6 Q4.4 19.6 5.4 19.6 L11.4 19.6"
            {...stroke}
          />
          <Path d="M11.4 4.4 L11.4 19.6" {...stroke} />
          <Path d="M10.4 12 L19.4 12" {...stroke} />
          <Path d="M16.6 9 L19.6 12 L16.6 15" {...stroke} />
        </G>
      );

    default:
      return null;
  }
}
