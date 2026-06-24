import { View, Text } from "react-native";
import Svg, { Path, Line } from "react-native-svg";
import { CameraScanRing } from "./CameraScanRing";

type Props = {
  slotName: string;
  slotIndex: number;
  total: number;
  qualityHints?: string[];
  scanning?: boolean;
  guideShape?: "oval" | "upper-u" | "lower-u" | "target";
};

/**
 * Editorial camera overlay — slot-specific guide shape on top of CameraView.
 * Used by the mouth-mapping capture flow.
 */
export function CameraOverlay({
  slotName,
  slotIndex,
  total,
  qualityHints = [],
  scanning = true,
  guideShape = "oval",
}: Props) {
  return (
    <View className="absolute inset-0 items-center justify-center pointer-events-none">
      {/* Top — slot title. Sits BELOW the Cancel/Natural-light/Flip
          control row (which already uses SafeAreaView ≈ 90px on notch
          devices). Drop further down to avoid overlap. */}
      <View className="absolute top-32 left-0 right-0 items-center px-6">
        <Text className="text-[10px] tracking-editorial uppercase text-bone/70 font-sans mb-1">
          Mouth scan · Photo {slotIndex} of {total}
        </Text>
        <Text
          className="font-display text-3xl text-bone"
          style={{
            textShadowColor: "rgba(0,0,0,0.55)",
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 8,
          }}
        >
          {slotName}
        </Text>
      </View>

      {/* Guide */}
      {guideShape === "oval" ? <OvalGuide scanning={scanning} /> : null}
      {guideShape === "upper-u" ? <UpperArchGuide /> : null}
      {guideShape === "lower-u" ? <LowerArchGuide /> : null}
      {guideShape === "target" ? <TargetGuide /> : null}

      {/* Quality hints */}
      <View className="absolute bottom-40 left-0 right-0 items-center gap-1.5 px-6">
        {qualityHints.length === 0 ? (
          <Text className="text-[11px] tracking-cap uppercase text-bone/80 font-sans">
            {hintFor(guideShape)}
          </Text>
        ) : (
          qualityHints.map((h, i) => (
            <Text
              key={i}
              className="text-[11px] tracking-cap uppercase text-gold font-sans"
            >
              · {h}
            </Text>
          ))
        )}
      </View>

      {/* Corner brackets */}
      <View className="absolute bottom-32 left-8 h-6 w-6 border-l border-b border-bone/30" />
      <View className="absolute bottom-32 right-8 h-6 w-6 border-r border-b border-bone/30" />
      <View className="absolute left-8 h-6 w-6 border-l border-t border-bone/30" style={{ top: 200 }} />
      <View className="absolute right-8 h-6 w-6 border-r border-t border-bone/30" style={{ top: 200 }} />
    </View>
  );
}

function hintFor(g: Props["guideShape"]): string {
  switch (g) {
    case "upper-u":
      return "Open wide · upper teeth in the arc";
    case "lower-u":
      return "Open wide · lower teeth in the arc";
    case "target":
      return "Get close · spot inside the square";
    default:
      return "Centre your smile in the oval";
  }
}

function OvalGuide({ scanning }: { scanning: boolean }) {
  // Toothpic-style: face oval + faint hand-drawn LIP silhouette inside it.
  // The lip outline tells the user *what part of the face to frame* without
  // any words. Matches the hand-drawn SketchIcon aesthetic used elsewhere.
  return (
    <View className="items-center justify-center">
      <View
        className="border-2 border-bone/25 rounded-full"
        style={{ width: 260, height: 320 }}
      />
      <View
        className="absolute border border-gold/40 rounded-full"
        style={{ width: 260, height: 320 }}
      />
      {/* Lip silhouette — Cupid's-bow upper, fuller lower, drawn with two
          shallow arcs centred in the oval. Pure white-on-camera. */}
      <Svg
        width={170}
        height={70}
        viewBox="0 0 170 70"
        style={{ position: "absolute", opacity: 0.55 }}
      >
        {/* Upper lip — left wing + Cupid's bow + right wing */}
        <Path
          d="M 8 38 C 26 12, 56 12, 73 28 C 78 22, 92 22, 97 28 C 114 12, 144 12, 162 38"
          stroke="rgba(245,241,232,0.85)"
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
        />
        {/* Mouth line */}
        <Path
          d="M 8 38 C 40 46, 130 46, 162 38"
          stroke="rgba(245,241,232,0.65)"
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
        />
        {/* Lower lip */}
        <Path
          d="M 14 40 C 40 64, 130 64, 156 40"
          stroke="rgba(245,241,232,0.85)"
          strokeWidth={1.6}
          fill="none"
          strokeLinecap="round"
        />
      </Svg>
      <View className="absolute">
        <CameraScanRing size={260} active={scanning} />
      </View>
    </View>
  );
}

/**
 * ToothRidge — a row of short vertical strokes evoking tooth positions.
 * Used inside the upper / lower U-arch guides as a hand-drawn silhouette
 * hint, mirroring Toothpic's overlay frames.
 */
function ToothRidge({
  width,
  flip = false,
}: {
  width: number;
  flip?: boolean;
}) {
  const teeth = 11;
  const margin = 18;
  const usable = width - margin * 2;
  const step = usable / (teeth - 1);
  return (
    <Svg
      width={width}
      height={22}
      viewBox={`0 0 ${width} 22`}
      style={{ position: "absolute", opacity: 0.55 }}
    >
      {Array.from({ length: teeth }).map((_, i) => {
        const x = margin + step * i;
        // Centre teeth are slightly taller — molars in the corners are
        // shorter so the row reads as an arch silhouette.
        const distFromCentre = Math.abs(i - (teeth - 1) / 2);
        const h = 14 - distFromCentre * 1.1;
        const y1 = flip ? 22 - h : 0;
        const y2 = flip ? 22 : h;
        return (
          <Line
            key={i}
            x1={x}
            y1={y1}
            x2={x}
            y2={y2}
            stroke="rgba(245,241,232,0.75)"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
        );
      })}
    </Svg>
  );
}

function UpperArchGuide() {
  // U-shape opening downward (upper jaw) — with a tooth-ridge silhouette
  // drawn along the inside of the arc so the user knows what the frame
  // should contain. Hand-drawn line aesthetic, no fills.
  return (
    <View className="items-center" style={{ marginBottom: 40 }}>
      <Text className="text-[10px] tracking-cap uppercase text-bone/60 font-sans mb-3">
        Frame the upper arch
      </Text>
      <View style={{ width: 280, height: 110, position: "relative" }}>
        <View
          className="border-2 border-bone/30 rounded-t-full"
          style={{ width: 280, height: 110, borderBottomWidth: 0 }}
        />
        <View
          className="absolute border border-gold/50 rounded-t-full"
          style={{ width: 280, height: 110, borderBottomWidth: 0, top: 18 }}
        />
        {/* Tooth ridge hanging downward inside the arch */}
        <View style={{ position: "absolute", left: 0, right: 0, bottom: 10 }}>
          <ToothRidge width={280} />
        </View>
      </View>
    </View>
  );
}

function LowerArchGuide() {
  // U-shape opening upward (lower jaw) — with a tooth-ridge silhouette
  // standing upward inside the arc. Mirror of UpperArchGuide.
  return (
    <View className="items-center" style={{ marginTop: 40 }}>
      <View style={{ width: 280, height: 110, position: "relative" }}>
        <View
          className="border-2 border-bone/30 rounded-b-full"
          style={{ width: 280, height: 110, borderTopWidth: 0 }}
        />
        <View
          className="absolute border border-gold/50 rounded-b-full"
          style={{ width: 280, height: 110, borderTopWidth: 0, bottom: 18 }}
        />
        {/* Tooth ridge standing upward inside the arch */}
        <View style={{ position: "absolute", left: 0, right: 0, top: 10 }}>
          <ToothRidge width={280} flip />
        </View>
      </View>
      <Text className="text-[10px] tracking-cap uppercase text-bone/60 font-sans mt-3">
        Frame the lower arch
      </Text>
    </View>
  );
}

function TargetGuide() {
  return (
    <View className="items-center justify-center">
      <View
        className="border-2 border-bone/30"
        style={{ width: 200, height: 200 }}
      />
      <View
        className="absolute border border-gold"
        style={{ width: 200, height: 200 }}
      />
      <View className="absolute">
        <View className="h-px w-12 bg-gold/80" />
        <View className="absolute h-12 w-px bg-gold/80" style={{ left: 24, marginTop: -24 }} />
      </View>
      <View
        className="absolute"
        style={{ top: -8, left: -8, width: 18, height: 18, borderTopWidth: 2, borderLeftWidth: 2, borderColor: "#A9CFC0" }}
      />
      <View
        className="absolute"
        style={{ top: -8, right: -8, width: 18, height: 18, borderTopWidth: 2, borderRightWidth: 2, borderColor: "#A9CFC0" }}
      />
      <View
        className="absolute"
        style={{ bottom: -8, left: -8, width: 18, height: 18, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: "#A9CFC0" }}
      />
      <View
        className="absolute"
        style={{ bottom: -8, right: -8, width: 18, height: 18, borderBottomWidth: 2, borderRightWidth: 2, borderColor: "#A9CFC0" }}
      />
    </View>
  );
}
