import { View, Text, Pressable, Image } from "react-native";

/**
 * Mouth arch capture guide — anatomical reference image.
 *
 * Per user direction ("use this and replace the image to teeth quad
 * in downloads"), the diagram is now a high-detail PNG of the dental
 * arches (occlusal view) shipped as an app asset. Tappable region
 * pins are overlaid on top of the image so the capture-region flow
 * still works.
 *
 * The PNG already has Front / Upper / Lower / Left / Right labels and
 * coral-tinted concern teeth baked in. Pins are positioned in
 * percentage-of-image coords so the layout survives scaling.
 *
 * Non-clinical. Pure wayfinder for the photo-capture flow.
 */

export type CaptureRegionKey =
  | "front-smile"
  | "upper-arch"
  | "lower-arch"
  | "problem-area";

export type CaptureRegionState = {
  key: CaptureRegionKey;
  captured: boolean;
  active?: boolean;
};

const TEETH_QUAD = require("@/assets/images/teeth-quad.png");

// Source PNG is 1024 × 1536 = aspect 2:3 (portrait).
const IMG_ASPECT = 2 / 3;

// Pin positions as a fraction of the rendered image (0..1, x then y).
// Eyeballed off the source PNG: upper arch sits in the top third,
// lower in the bottom third, centre band is the mid-gap, and the
// concern band lines up with the coral-tinted teeth on the upper-right.
const PIN_POS: Record<CaptureRegionKey, { x: number; y: number }> = {
  "front-smile": { x: 0.5, y: 0.5 },
  "upper-arch": { x: 0.5, y: 0.16 },
  "lower-arch": { x: 0.5, y: 0.84 },
  "problem-area": { x: 0.72, y: 0.22 },
};

const REGION_LABEL: Record<CaptureRegionKey, string> = {
  "front-smile": "1",
  "upper-arch": "2",
  "lower-arch": "3",
  "problem-area": "4",
};

const REGION_NAME: Record<CaptureRegionKey, string> = {
  "front-smile": "Front smile",
  "upper-arch": "Upper arch",
  "lower-arch": "Lower arch",
  "problem-area": "Concern area",
};

export function MouthArchDiagram({
  regions,
  onPressRegion,
  size = 320,
}: {
  regions: CaptureRegionState[];
  onPressRegion?: (key: CaptureRegionKey) => void;
  size?: number;
}) {
  const imgW = size;
  const imgH = size / IMG_ASPECT;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ width: imgW, height: imgH }}>
        <Image
          source={TEETH_QUAD}
          resizeMode="contain"
          style={{ width: imgW, height: imgH }}
          accessibilityLabel="Mouth arch capture guide — upper and lower teeth"
        />

        {/* Region pins overlaid on the image. */}
        {regions.map((r) => {
          const pos = PIN_POS[r.key];
          if (!pos) return null;
          const captured = r.captured;
          const active = r.active && !captured;
          const concern = r.key === "problem-area" && !captured && !active;
          const bg = captured
            ? "#2E7268"
            : active
              ? "#C9A961"
              : concern
                ? "#D87560"
                : "#FFFFFF";
          const fg = captured || active || concern ? "#FFFFFF" : "#2E7268";
          const border = captured
            ? "#1F4F47"
            : active
              ? "#8A6B22"
              : concern
                ? "#7A4332"
                : "#5FA89B";
          const px = pos.x * imgW - 14;
          const py = pos.y * imgH - 14;
          return (
            <Pressable
              key={r.key}
              onPress={onPressRegion ? () => onPressRegion(r.key) : undefined}
              style={{
                position: "absolute",
                left: px,
                top: py,
                width: 28,
                height: 28,
                borderRadius: 14,
                backgroundColor: bg,
                borderWidth: 1.5,
                borderColor: border,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#2E7268",
                shadowOpacity: 0.18,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 2 },
                elevation: 3,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 12,
                  fontWeight: "700",
                  color: fg,
                  includeFontPadding: false,
                }}
              >
                {captured ? "✓" : REGION_LABEL[r.key]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Legend pills below the diagram. */}
      <View
        style={{
          marginTop: 18,
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 8,
          paddingHorizontal: 10,
        }}
      >
        {regions.map((r) => {
          const captured = r.captured;
          const active = r.active && !captured;
          const isConcern = r.key === "problem-area";
          const bg = captured
            ? "rgba(46,114,104,0.10)"
            : active
              ? "rgba(201,169,97,0.16)"
              : isConcern
                ? "rgba(216,117,96,0.14)"
                : "rgba(95,168,155,0.10)";
          const accent = captured
            ? "#2E7268"
            : active
              ? "#8A6B22"
              : isConcern
                ? "#9E5E47"
                : "#2E7268";
          return (
            <View
              key={r.key}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: bg,
              }}
            >
              <View
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: captured
                    ? "#2E7268"
                    : active
                      ? "#C9A961"
                      : isConcern
                        ? "#D87560"
                        : "#FFFFFF",
                  borderWidth: 1,
                  borderColor: captured
                    ? "#2E7268"
                    : active
                      ? "#C9A961"
                      : isConcern
                        ? "#9E5E47"
                        : "#5FA89B",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 9,
                    fontWeight: "700",
                    color:
                      captured || active || isConcern ? "#FFFFFF" : "#2E7268",
                  }}
                >
                  {captured ? "✓" : REGION_LABEL[r.key]}
                </Text>
              </View>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 11,
                  fontWeight: "600",
                  letterSpacing: 0.2,
                  color: accent,
                }}
              >
                {REGION_NAME[r.key]}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
