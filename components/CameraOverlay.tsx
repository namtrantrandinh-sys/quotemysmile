import { View, Text } from "react-native";
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
      {/* Top — slot title */}
      <View className="absolute top-16 left-0 right-0 items-center px-6">
        <Text className="text-[10px] tracking-editorial uppercase text-bone/70 font-sans mb-1">
          Mouth scan · Photo {slotIndex} of {total}
        </Text>
        <Text className="font-display text-3xl text-bone">{slotName}</Text>
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
      <View className="absolute top-32 left-8 h-6 w-6 border-l border-t border-bone/30" />
      <View className="absolute top-32 right-8 h-6 w-6 border-r border-t border-bone/30" />
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
      <View className="absolute">
        <CameraScanRing size={260} active={scanning} />
      </View>
    </View>
  );
}

function UpperArchGuide() {
  // U-shape opening downward (upper jaw)
  return (
    <View className="items-center" style={{ marginBottom: 40 }}>
      <Text className="text-[10px] tracking-cap uppercase text-bone/60 font-sans mb-3">
        Frame the upper arch
      </Text>
      <View
        className="border-2 border-bone/30 rounded-t-full"
        style={{ width: 280, height: 110, borderBottomWidth: 0 }}
      />
      <View
        className="absolute border border-gold/50 rounded-t-full"
        style={{ width: 280, height: 110, borderBottomWidth: 0, marginTop: 18 }}
      />
    </View>
  );
}

function LowerArchGuide() {
  // U-shape opening upward (lower jaw)
  return (
    <View className="items-center" style={{ marginTop: 40 }}>
      <View
        className="border-2 border-bone/30 rounded-b-full"
        style={{ width: 280, height: 110, borderTopWidth: 0 }}
      />
      <View
        className="absolute border border-gold/50 rounded-b-full"
        style={{ width: 280, height: 110, borderTopWidth: 0, marginBottom: 18 }}
      />
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
