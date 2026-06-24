/**
 * Dentist + clinic services.
 */
import { supabase } from "@/lib/supabase";
import { breadcrumb, captureError } from "@/lib/observability";
import type { CategoryId } from "@/lib/types";

export type CreateClinicInput = {
  name: string;
  abn: string;
  address: string;
  coords: { lat: number; lng: number };
  serviceRadiusKm: number;
  categories: CategoryId[];
  piiProvider?: string;
  piiPolicy?: string;
  piiExpiry?: string;
};

export async function createClinic(input: CreateClinicInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("clinics")
    .insert({
      owner_user_id: user.id,
      name: input.name,
      abn: input.abn,
      address: input.address,
      location: `SRID=4326;POINT(${input.coords.lng} ${input.coords.lat})`,
      service_radius_km: input.serviceRadiusKm,
      categories: input.categories,
      pii_provider: input.piiProvider ?? null,
      pii_policy: input.piiPolicy ?? null,
      pii_expiry: input.piiExpiry ?? null,
      verified: false,
    })
    .select("id, name, verified")
    .single();
  if (error) throw error;
  return data;
}

export async function getMyClinic() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  // A dentist may own multiple clinic rows. `getMyClinic` is the legacy
  // accessor used by code paths that only need *some* clinic (e.g. the
  // verification banner). We return the first row by created_at to keep
  // behaviour stable; multi-clinic callers should use `listMyClinics`.
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * List ALL clinics owned by the signed-in dentist. Used by the
 * multi-clinic settings screen so dentists who practise at two or more
 * locations can manage radius / categories / accepting independently
 * per site. Ordered by created_at so the primary clinic stays on top.
 */
export async function listMyClinics() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from("clinics")
    .select("*")
    .eq("owner_user_id", user.id)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Patch a SPECIFIC clinic by id. The single-clinic `updateMyClinic`
 * helper is kept for compatibility with code paths that pre-date the
 * multi-clinic shift, but new screens should target a clinic explicitly.
 */
export async function updateClinic(
  clinicId: string,
  input: {
    serviceRadiusKm?: number;
    categories?: CategoryId[];
    phone?: string | null;
    accepting?: boolean;
  },
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const patch: Record<string, unknown> = {};
  if (input.serviceRadiusKm != null) patch.service_radius_km = input.serviceRadiusKm;
  if (input.categories) patch.categories = input.categories;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.accepting !== undefined) patch.accepting = input.accepting;
  if (Object.keys(patch).length === 0) return null;
  const { data, error } = await supabase
    .from("clinics")
    .update(patch)
    .eq("id", clinicId)
    .eq("owner_user_id", user.id)
    .select("id, name, accepting, service_radius_km, categories, phone")
    .maybeSingle();
  if (error) {
    captureError(error, { ctx: "updateClinic", clinicId });
    throw error;
  }
  breadcrumb("ahpra", "clinic.updated", { fields: Object.keys(patch), clinicId });
  return data;
}

/**
 * Remove one clinic from the dentist's roster. Only allowed if it's not
 * the LAST clinic — a dentist must always have at least one or they
 * become unable to receive any requests, which is the wrong UX. The
 * caller is expected to check that there are >= 2 clinics first.
 */
export async function deleteClinic(clinicId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("clinics")
    .delete()
    .eq("id", clinicId)
    .eq("owner_user_id", user.id);
  if (error) {
    captureError(error, { ctx: "deleteClinic", clinicId });
    throw error;
  }
  breadcrumb("ahpra", "clinic.deleted", { clinicId });
}

/**
 * Update editable clinic settings — radius, categories, phone, and the
 * self-pause toggle. RLS enforces that only the clinic owner can update.
 */
export async function updateMyClinic(input: {
  serviceRadiusKm?: number;
  categories?: CategoryId[];
  phone?: string | null;
  accepting?: boolean;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const patch: Record<string, unknown> = {};
  if (input.serviceRadiusKm != null) patch.service_radius_km = input.serviceRadiusKm;
  if (input.categories) patch.categories = input.categories;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.accepting !== undefined) patch.accepting = input.accepting;
  if (Object.keys(patch).length === 0) return null;
  const { data, error } = await supabase
    .from("clinics")
    .update(patch)
    .eq("owner_user_id", user.id)
    .select("id, accepting, service_radius_km, categories, phone")
    .maybeSingle();
  if (error) {
    captureError(error, { ctx: "updateMyClinic" });
    throw error;
  }
  breadcrumb("ahpra", "clinic.updated", { fields: Object.keys(patch) });
  return data;
}

/**
 * Live nearby requests for the calling dentist.
 * RLS already filters to requests within their clinic's geofence + matching
 * categories. We just SELECT and the database does the geo filter.
 */
export async function listLiveNearbyRequests() {
  const { data, error } = await supabase
    .from("requests")
    .select("id, category, status, closes_at, photo_quality_score, symptom_json, opens_at")
    .eq("status", "open")
    .order("opens_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

/**
 * Realtime subscription to new requests in the dentist's geofence.
 * RLS gates the broadcast — we receive only what we're allowed to see.
 */
export function subscribeNearbyRequests(onChange: (payload: unknown) => void) {
  return supabase
    .channel(`requests:nearby`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "requests" },
      onChange,
    )
    .subscribe();
}

/**
 * Trigger the AHPRA + ABN verification edge fns. Used at the end of onboarding
 * and from the VerificationBanner "Recheck" action.
 */
export async function verifyCredentials(input: {
  ahpraNo: string;
  expectedName: string;
  abn?: string;
  clinicId?: string;
}) {
  breadcrumb("ahpra", "verifyCredentials:start", {
    ahpraNo: input.ahpraNo,
    hasAbn: !!input.abn,
  });
  const [{ data: ahpra, error: ahpraErr }, abn] = await Promise.all([
    supabase.functions.invoke("ahpra-lookup", {
      body: { ahpraNo: input.ahpraNo, expectedName: input.expectedName },
    }),
    input.abn && input.clinicId
      ? supabase.functions
          .invoke("abn-lookup", {
            body: { abn: input.abn, clinicId: input.clinicId },
          })
          .then((r) => r.data)
          .catch(() => null)
      : Promise.resolve(null),
  ]);
  if (ahpraErr) captureError(ahpraErr, { ctx: "verifyCredentials.ahpra" });
  breadcrumb("ahpra", "verifyCredentials:done", {
    ahpraStatus: (ahpra as { status?: string } | undefined)?.status,
  });
  return { ahpra, abn };
}

/**
 * Fetch the current verification status from users + clinics.
 */
export async function getVerificationStatus() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const [me, clinic] = await Promise.all([
    supabase
      .from("dentist_profiles")
      .select(
        "ahpra_no, ahpra_status, ahpra_reg_type, ahpra_verified_at, ahpra_last_checked_at",
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("clinics")
      .select("id, abn, abn_verified_at")
      .eq("owner_user_id", user.id)
      .maybeSingle(),
  ]);
  return {
    ahpra: me.data,
    clinic: clinic.data,
  };
}

/**
 * Sum the dentist's accrued A$5 platform fees this calendar month.
 * Reads the public.events ledger (`dentist.fee_owed` rows) filtered to the
 * current dentist (RLS-gated by actor_id = auth.uid()). Used by the dentist
 * dashboard widget so they see what they'll be invoiced.
 */
export async function getMyAccruedFees(): Promise<{
  cents: number;
  bookings: number;
  monthStart: string;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { cents: 0, bookings: 0, monthStart: new Date().toISOString() };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const { data, error } = await supabase
    .from("events")
    .select("payload")
    .eq("type", "dentist.fee_owed")
    .eq("actor_id", user.id)
    .gte("ts", monthStart)
    .limit(1000);
  if (error) {
    captureError(error, { ctx: "getMyAccruedFees" });
    return { cents: 0, bookings: 0, monthStart };
  }
  const cents = (data ?? []).reduce(
    (sum, row) =>
      sum +
      Number((row.payload as { amount_cents?: number } | null)?.amount_cents ?? 0),
    0,
  );
  return { cents, bookings: data?.length ?? 0, monthStart };
}

/**
 * Total quote value the dentist has banked through QMS.
 *
 * Sums `quotes.total` for every quote attached to a confirmed booking
 * owned by one of this dentist's clinics. We treat a confirmed booking
 * as "earned" because the deposit has cleared and the slot is held —
 * even if the patient no-shows, the quote represented secured revenue
 * intent. Result: total + this-month + per-month-average so the
 * dashboard can render three meaningful numbers, not just one.
 *
 * The "average" here is patient-side average ticket on bookings won,
 * which doubles as a useful comparison anchor for the per-clinic
 * benchmarking work coming next.
 */
export async function getMyEarnings(): Promise<{
  totalCents: number;
  monthCents: number;
  bookings: number;
  bookingsThisMonth: number;
  avgTicketCents: number;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      totalCents: 0,
      monthCents: 0,
      bookings: 0,
      bookingsThisMonth: 0,
      avgTicketCents: 0,
    };
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // RLS already scopes `bookings` to the dentist's own clinics, so we
  // don't need to filter on clinic_id ourselves. Join the quote total
  // in one round-trip so we can sum without a second query.
  const { data, error } = await supabase
    .from("bookings")
    .select("id, status, created_at, quotes(total)")
    .in("status", ["confirmed", "completed", "attended"])
    .limit(2000);

  if (error) {
    captureError(error, { ctx: "getMyEarnings" });
    return {
      totalCents: 0,
      monthCents: 0,
      bookings: 0,
      bookingsThisMonth: 0,
      avgTicketCents: 0,
    };
  }

  let totalCents = 0;
  let monthCents = 0;
  let bookingsThisMonth = 0;
  // Supabase types the embedded `quotes` relation as an ARRAY because it
  // can't statically know the join is 1:1. At runtime there's exactly
  // one quotes row per booking (FK on bookings.quote_id), so flatten the
  // first element. Cast via `unknown` because the inferred array shape
  // doesn't sufficiently overlap with the single-object type we want.
  const rows = (data ?? []) as unknown as Array<{
    id: string;
    created_at: string | null;
    quotes: { total: number | null } | { total: number | null }[] | null;
  }>;
  for (const r of rows) {
    const q = Array.isArray(r.quotes)
      ? (r.quotes.length > 0 ? r.quotes[0] : null)
      : r.quotes;
    const dollars = q?.total ?? 0;
    const cents = Math.round(dollars * 100);
    totalCents += cents;
    if (r.created_at && r.created_at >= monthStart) {
      monthCents += cents;
      bookingsThisMonth += 1;
    }
  }
  const bookings = rows.length;
  const avgTicketCents = bookings > 0 ? Math.round(totalCents / bookings) : 0;
  return {
    totalCents,
    monthCents,
    bookings,
    bookingsThisMonth,
    avgTicketCents,
  };
}

/**
 * Provision the Stripe Customer + SetupIntent so the dentist can save a card
 * on file. Returns the client_secret + ephemeralKey + customerId for the
 * Payment Sheet to mount in setup mode.
 */
export async function createCustomerSetup(): Promise<{
  customerId: string;
  setupIntentClientSecret: string;
  ephemeralKey: string | null;
}> {
  breadcrumb("payment", "createCustomerSetup:start");
  const { data, error } = await supabase.functions.invoke(
    "stripe-create-customer",
    { body: {} },
  );
  if (error) {
    captureError(error, { ctx: "createCustomerSetup" });
    throw error;
  }
  return data as {
    customerId: string;
    setupIntentClientSecret: string;
    ephemeralKey: string | null;
  };
}

/**
 * Check if the dentist already has a card on file. Returns true if a
 * Stripe customer id is on their user row — fetching the actual default
 * payment method requires a server call and isn't strictly needed for the
 * "saved · update" UX hint.
 */
export async function hasCardOnFile(): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("dentist_profiles")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  return !!data?.stripe_customer_id;
}

export async function ackDentistOnboarding(acks: Array<{ key: string; accepted_at: string }>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("dentist_profiles")
    .update({ onboarding_acks: acks })
    .eq("user_id", user.id);
  if (error) throw error;
}
