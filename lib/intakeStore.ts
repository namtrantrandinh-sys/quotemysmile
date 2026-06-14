/**
 * Ephemeral in-memory intake store.
 *
 * The patient flow collects intake across multiple screens before submit.
 * Production: replace with Zustand or React Context. For MVP, a tiny
 * module-level store is enough.
 */
import type { CategoryId, Urgency } from "@/lib/types";

export type IntakeSnapshot = {
  category?: CategoryId;
  symptomJson?: Record<string, unknown>;
  healthFund?: {
    provider?: string;
    level?: string | null;
    member_id_last4?: string | null;
  };
  photoUris?: string[];
  photoQualityScore?: number;
  coords?: { lat: number; lng: number };
  radiusKm?: number;
  urgency?: Urgency;
};

let snapshot: IntakeSnapshot = {};

export function setIntake(patch: Partial<IntakeSnapshot>) {
  snapshot = { ...snapshot, ...patch };
}

export function getIntake(): IntakeSnapshot {
  return snapshot;
}

export function clearIntake() {
  snapshot = {};
}
