/**
 * Intake store.
 *
 * Holds the in-progress patient request between screens. Memory is the
 * source of truth so reads are synchronous, but every write is mirrored
 * to AsyncStorage so a backgrounded app (e.g. a phone call during photo
 * capture) doesn't lose all progress on resume.
 *
 * The hydrate() helper is called from the root layout at boot.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
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

const STORAGE_KEY = "qms.intake.v1";

let snapshot: IntakeSnapshot = {};
let hydrated = false;

function persist() {
  // Fire-and-forget. AsyncStorage failures must never crash the flow.
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot)).catch(() => {});
}

export function setIntake(patch: Partial<IntakeSnapshot>) {
  snapshot = { ...snapshot, ...patch };
  persist();
}

export function getIntake(): IntakeSnapshot {
  return snapshot;
}

export function clearIntake() {
  snapshot = {};
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
}

/**
 * Restore any prior in-progress intake. Call once at app boot.
 * Returns the hydrated snapshot so the caller can decide whether to
 * resume the user mid-flow.
 */
export async function hydrateIntake(): Promise<IntakeSnapshot> {
  if (hydrated) return snapshot;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IntakeSnapshot;
      // Only restore if there's something meaningful — empty snapshots
      // happen on clean install and shouldn't trigger any resume UX.
      if (Object.keys(parsed).length > 0) {
        snapshot = parsed;
      }
    }
  } catch {
    // Corrupt JSON or missing key — fall back to empty.
  }
  return snapshot;
}
