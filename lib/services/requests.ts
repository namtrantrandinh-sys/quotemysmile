/**
 * QMS request + quote services.
 *
 * All Supabase calls live here. UI never touches `supabase` directly.
 * RLS in the database is the source of truth — these helpers assume
 * the authenticated user has the right role.
 */
import { supabase } from "@/lib/supabase";
import type { CategoryId, Urgency } from "@/lib/types";
import { URGENCY_META } from "@/lib/types";

export type SubmitRequestInput = {
  category: CategoryId;
  symptomJson: Record<string, unknown>;
  healthFund?: {
    provider?: string;
    level?: string | null;
    member_id_last4?: string | null;
  };
  photoUrls: string[];
  photoQualityScore: number;
  coords: { lat: number; lng: number };
  radiusKm: number;
  urgency?: Urgency;
};

export async function submitRequest(input: SubmitRequestInput) {
  const urgency = input.urgency ?? "24h";
  const minutes = URGENCY_META[urgency].closesInMin;
  const closesAt = new Date(Date.now() + minutes * 60_000).toISOString();

  // The urgency column is stored in symptom_json until migration 0009 is
  // applied (we keep the request insert backward-compatible).
  const symptomJsonWithUrgency = {
    ...(input.symptomJson ?? {}),
    __urgency: urgency,
  };

  const { data, error } = await supabase
    .from("requests")
    .insert({
      category: input.category,
      symptom_json: symptomJsonWithUrgency,
      health_fund_json: input.healthFund ?? {},
      photo_urls: input.photoUrls,
      photo_quality_score: Math.round(input.photoQualityScore * 10) / 10,
      location: `SRID=4326;POINT(${input.coords.lng} ${input.coords.lat})`,
      radius_km: input.radiusKm,
      status: "open",
      closes_at: closesAt,
    })
    .select("id, closes_at")
    .single();

  if (error) throw error;
  return data;
}

export async function getRequest(id: string) {
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

/**
 * Server-side count of nearby verified dentists for a point.
 * Used live as the patient drags the radius slider.
 */
export async function nearbyDentistsCount(input: {
  lat: number;
  lng: number;
  radiusKm: number;
  category?: string;
}): Promise<number> {
  const { data, error } = await supabase.rpc("nearby_dentists_count", {
    _lat: input.lat,
    _lng: input.lng,
    _radius_km: input.radiusKm,
    _category: input.category ?? null,
  });
  if (error) return 0;
  return (data as number) ?? 0;
}

/**
 * Fetch a single request as a quoting dentist (RLS handles the geofence).
 */
export async function getRequestForDentist(id: string) {
  const { data, error } = await supabase
    .from("requests")
    .select(
      "id, category, status, opens_at, closes_at, photo_urls, photo_quality_score, symptom_json, location, radius_km",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listMyActiveRequests() {
  const { data, error } = await supabase
    .from("requests")
    .select("id, category, status, opens_at, closes_at")
    .in("status", ["open", "patient_review"])
    .order("opens_at", { ascending: false });
  if (error) throw error;
  return data;
}
