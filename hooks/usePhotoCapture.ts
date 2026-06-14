/**
 * usePhotoCapture — guided 4-slot mouth scan.
 *
 * Mouth-mapping flow:
 *  1. Front smile      — relaxed lips, teeth together
 *  2. Upper arch       — open wide, upper teeth visible
 *  3. Lower arch       — open wide, lower teeth visible
 *  4. Problem area     — zoom on the symptom
 *
 * Captures via expo-camera, compresses through expo-image-manipulator
 * (long edge 1200px, JPEG q=0.75) and scores quality heuristically.
 *
 * NOT a clinical assessment. The dentist is the diagnostician.
 * Frames us out of TGA medical-device classification.
 */
import { useCallback, useState } from "react";
import * as ImageManipulator from "expo-image-manipulator";

export type PhotoSlotName =
  | "front-smile"
  | "upper-arch"
  | "lower-arch"
  | "problem-area";

export type PhotoSlot = {
  id: number;
  name: PhotoSlotName;
  label: string;
  hint: string;
  guideShape: "oval" | "upper-u" | "lower-u" | "target";
  uri?: string;
  width?: number;
  height?: number;
  qualityScore?: number;
  qualityFlags?: Array<"blurry" | "dark" | "bright" | "off-centre" | "good">;
  capturedAt?: string;
};

const INITIAL: PhotoSlot[] = [
  {
    id: 1,
    name: "front-smile",
    label: "Front smile",
    hint: "Lips relaxed, teeth together.",
    guideShape: "oval",
  },
  {
    id: 2,
    name: "upper-arch",
    label: "Upper arch",
    hint: "Open wide. Aim phone slightly upward.",
    guideShape: "upper-u",
  },
  {
    id: 3,
    name: "lower-arch",
    label: "Lower arch",
    hint: "Open wide. Lower lip out of the way.",
    guideShape: "lower-u",
  },
  {
    id: 4,
    name: "problem-area",
    label: "Problem area",
    hint: "Close-up of the spot that bothers you.",
    guideShape: "target",
  },
];

async function processCapture(rawUri: string) {
  const result = await ImageManipulator.manipulateAsync(
    rawUri,
    [{ resize: { width: 1200 } }],
    { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG },
  );
  return { uri: result.uri, width: result.width, height: result.height };
}

function scoreCapture(meta: { width: number; height: number }): {
  score: number;
  flags: PhotoSlot["qualityFlags"];
} {
  const flags: NonNullable<PhotoSlot["qualityFlags"]> = [];
  let score = 5;
  if (meta.width < 800) {
    flags.push("blurry");
    score -= 1.5;
  }
  const aspect = meta.width / Math.max(1, meta.height);
  if (aspect < 0.6 || aspect > 1.8) {
    flags.push("off-centre");
    score -= 0.5;
  }
  if (flags.length === 0) flags.push("good");
  return { score: Math.max(1, Math.min(5, score)), flags };
}

export function usePhotoCapture() {
  const [slots, setSlots] = useState<PhotoSlot[]>(INITIAL);

  const capture = useCallback(async (slotId: number, rawUri: string) => {
    try {
      const processed = await processCapture(rawUri);
      const { score, flags } = scoreCapture({
        width: processed.width,
        height: processed.height,
      });
      setSlots((current) =>
        current.map((s) =>
          s.id === slotId
            ? {
                ...s,
                uri: processed.uri,
                width: processed.width,
                height: processed.height,
                qualityScore: score,
                qualityFlags: flags,
                capturedAt: new Date().toISOString(),
              }
            : s,
        ),
      );
    } catch (e) {
      console.warn("[QMS] photo capture failed", e);
    }
  }, []);

  const retake = useCallback((slotId: number) => {
    setSlots((current) =>
      current.map((s) =>
        s.id === slotId
          ? {
              id: s.id,
              name: s.name,
              label: s.label,
              hint: s.hint,
              guideShape: s.guideShape,
            }
          : s,
      ),
    );
  }, []);

  const overallQuality =
    slots.reduce((sum, s) => sum + (s.qualityScore ?? 0), 0) / slots.length;
  const allCaptured = slots.every((s) => s.uri);
  const capturedCount = slots.filter((s) => s.uri).length;
  const nextSlot = slots.find((s) => !s.uri) ?? null;

  return {
    slots,
    capture,
    retake,
    overallQuality,
    allCaptured,
    capturedCount,
    nextSlot,
    totalSlots: slots.length,
  };
}
