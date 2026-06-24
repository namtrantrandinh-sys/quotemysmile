/**
 * Admin services — clinic verification queue + flagged quote notes.
 *
 * RLS will block unless the calling user has `is_admin = true` in public.users.
 * To bootstrap your first admin: SQL editor →
 *   update public.users set is_admin = true where id='<your-uuid>';
 */
import { supabase } from "@/lib/supabase";

export async function listPendingClinics() {
  const { data, error } = await supabase
    .from("clinics")
    .select("id, name, abn, address, owner_user_id, abn_verified_at, created_at")
    .eq("verified", false)
    .order("created_at", { ascending: true })
    .limit(50);
  if (error) throw error;
  return data;
}

export async function verifyClinic(clinicId: string) {
  const { error } = await supabase
    .from("clinics")
    .update({ verified: true })
    .eq("id", clinicId);
  if (error) throw error;
}

export async function listFlaggedNotes() {
  const { data, error } = await supabase
    .from("events")
    .select("id, actor_id, request_id, payload, ts")
    .eq("type", "quote.note_flagged")
    .order("ts", { ascending: false })
    .limit(50);
  if (error) throw error;
  return data;
}

/* -------------------------------------------------------------------------- */
/* AHPRA verification queue                                                   */
/* -------------------------------------------------------------------------- */

export type AhpraQueueRow = {
  id: string;
  full_name: string;
  ahpra_no: string | null;
  ahpra_status: string;
  ahpra_reg_type: string | null;
  ahpra_last_checked_at: string | null;
  clinic_name: string | null;
  clinic_abn: string | null;
};

export async function listAhpraQueue(): Promise<AhpraQueueRow[]> {
  const { data, error } = await supabase
    .from("dentist_profiles")
    .select(
      "user_id, full_name, ahpra_no, ahpra_status, ahpra_reg_type, ahpra_last_checked_at, clinics!clinics_owner_user_id_fkey(name, abn)",
    )
    .in("ahpra_status", ["unknown", "pending", "conditional", "suspended", "not_found"])
    .order("ahpra_last_checked_at", { ascending: false, nullsFirst: true })
    .limit(100);
  if (error) throw error;

  return ((data as unknown as Array<{
    user_id: string;
    full_name: string;
    ahpra_no: string | null;
    ahpra_status: string;
    ahpra_reg_type: string | null;
    ahpra_last_checked_at: string | null;
    clinics:
      | { name?: string; abn?: string }[]
      | { name?: string; abn?: string }
      | null;
  }>) ?? []).map((r) => {
    const c = Array.isArray(r.clinics) ? r.clinics[0] : r.clinics;
    return {
      id: r.user_id,
      full_name: r.full_name,
      ahpra_no: r.ahpra_no,
      ahpra_status: r.ahpra_status,
      ahpra_reg_type: r.ahpra_reg_type,
      ahpra_last_checked_at: r.ahpra_last_checked_at,
      clinic_name: c?.name ?? null,
      clinic_abn: c?.abn ?? null,
    };
  });
}

/**
 * Admin can force a fresh AHPRA check for a dentist, bypassing the 24-hour
 * cache by clearing ahpra_last_checked_at first.
 */
export async function forceRecheckAhpra(userId: string, ahpraNo: string) {
  await supabase
    .from("dentist_profiles")
    .update({ ahpra_last_checked_at: null })
    .eq("user_id", userId);

  const { data, error } = await supabase.functions.invoke("ahpra-lookup", {
    body: { ahpraNo, expectedName: "" },
  });
  if (error) throw error;
  return data;
}

/**
 * Tail the events table — admin-only debugging stream. Filters can narrow to
 * a particular booking, request, or event type.
 */
export type EventRow = {
  id: number;
  actor_id: string | null;
  request_id: string | null;
  type: string;
  payload: Record<string, unknown>;
  ts: string;
};

export async function listRecentEvents(opts?: {
  type?: string;
  bookingId?: string;
  limit?: number;
}): Promise<EventRow[]> {
  let q = supabase
    .from("events")
    .select("id, actor_id, request_id, type, payload, ts")
    .order("ts", { ascending: false })
    .limit(opts?.limit ?? 100);
  if (opts?.type) q = q.eq("type", opts.type);
  if (opts?.bookingId) {
    q = q.filter("payload->>booking_id", "eq", opts.bookingId);
  }
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

/**
 * Force a dentist into 'suspended' state — used when admin has off-platform
 * evidence (regulator notice, complaint outcome) ahead of the public register
 * update.
 */
export async function blockDentist(userId: string, reason: string) {
  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("dentist_profiles")
    .update({
      ahpra_status: "suspended",
      ahpra_verified_at: null,
      ahpra_last_checked_at: nowIso,
    })
    .eq("user_id", userId);
  if (error) throw error;
  await supabase.from("events").insert({
    actor_id: userId,
    type: "admin.dentist_blocked",
    payload: { reason, at: nowIso },
  });
}
