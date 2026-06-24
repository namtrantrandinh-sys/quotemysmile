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
  // Friendly auth check — RLS would block anyway but the error string is
  // cryptic. This lets the caller surface "Sign in first" instead.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Sign in to submit a request — your photos won't be lost.");
  }

  // Pre-flight: RLS policy `requests_patient_insert` (migration 0027)
  // requires a `patient_profiles` row for the authed user. Without it
  // the insert fails with a cryptic "new row violates row-level security
  // policy" that we previously surfaced as the unhelpful generic
  // "Submit failed" screen. Upsert the shell row here so the user can
  // always submit a request — they may have come through a partial
  // sign-up flow (Apple SIWA, magic link) that skipped profile create.
  const { error: profileErr } = await supabase
    .from("patient_profiles")
    .upsert(
      { user_id: user.id, full_name: user.user_metadata?.full_name ?? null },
      { onConflict: "user_id", ignoreDuplicates: false },
    );
  if (profileErr) {
    throw new Error(
      `Could not prepare your patient profile (${profileErr.message}). Please sign out and back in.`,
    );
  }

  // NOTE: photoUrls is intentionally empty at this point — the
  // submitting screen creates the request row FIRST, then uploads
  // photos in parallel and patches photo_urls onto the row.

  const urgency = input.urgency ?? "24h";
  const minutes = URGENCY_META[urgency].closesInMin;
  const closesAt = new Date(Date.now() + minutes * 60_000).toISOString();

  // Keep the legacy backward-compat copy in symptom_json (older RLS
  // policies / triggers read it) AND set the real `urgency` enum column
  // that migration 0009 added. Sending both means the insert works on
  // any migration state.
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
      urgency,
    })
    .select("id, closes_at")
    .single();

  // Supabase's PostgrestError is a plain object, not an Error instance.
  // The submitting screen checks `e instanceof Error ? e.message : "Submit failed"`
  // — without rewrapping, the user only ever sees the bare "Submit failed"
  // string and never the actual cause. Rewrap so the real DB message
  // surfaces (RLS denials, NOT NULL violations, enum mismatches, etc.).
  if (error) {
    const wrapped = new Error(error.message || "Could not save your request.");
    (wrapped as Error & { code?: string }).code = error.code;
    throw wrapped;
  }
  return data;
}

export async function getRequest(id: string) {
  // maybeSingle() — request may genuinely not exist (stale deep-link,
  // expired live feed, request soft-deleted). single() throws PGRST116
  // when no row matches, which would crash the screen on a perfectly
  // recoverable miss. Caller handles null.
  const { data, error } = await supabase
    .from("requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();
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

/**
 * Quote-count summary for an open request. Used by the patient-home
 * hero status card to surface "N dentists quoted" without paging
 * through the full quote list.
 *
 * Cheap because we ask Postgres for the count only — the `head:true`
 * mode skips returning rows. RLS scopes to the requester anyway.
 */
export async function quoteCountForRequest(requestId: string): Promise<number> {
  const { count, error } = await supabase
    .from("quotes")
    .select("id", { count: "exact", head: true })
    .eq("request_id", requestId)
    .in("status", ["live", "final"]);
  if (error) return 0;
  return count ?? 0;
}
