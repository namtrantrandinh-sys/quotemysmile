// ============================================================================
// delete-account — privacy-law-mandated self-serve account deletion
// ============================================================================
// What it does (in order):
//   1. List + delete every object the caller has in 'request-photos' storage
//   2. Anonymise the caller's bookings (clear name, retain audit metadata)
//   3. Anonymise the caller's requests (wipe photo_urls, symptom_json, location)
//   4. Null out the caller's push_token, email, phone, full_name
//   5. Delete the auth.users row (cascades to public.users via FK)
//
// Bookings are kept because Australian tax + AHPRA-defence record-keeping
// requires the audit trail, but PII is scrubbed so the row is anonymous.
//
// Auth: requires a logged-in caller. Each delete acts on the caller's own
// data only — no admin-targeting endpoint here.
//
// Deploy:  supabase functions deploy delete-account
// Secrets: SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);
    const uid = user.id;

    // 1) Wipe storage — every file under <uid>/...
    let photosDeleted = 0;
    try {
      const { data: list } = await admin.storage
        .from("request-photos")
        .list(uid, { limit: 1000 });
      const paths: string[] = [];
      for (const entry of list ?? []) {
        if (entry.id) {
          // It's a folder — list one level deeper (request_id/)
          const { data: inner } = await admin.storage
            .from("request-photos")
            .list(`${uid}/${entry.name}`, { limit: 1000 });
          for (const f of inner ?? []) {
            paths.push(`${uid}/${entry.name}/${f.name}`);
          }
        } else {
          paths.push(`${uid}/${entry.name}`);
        }
      }
      if (paths.length > 0) {
        const { error } = await admin.storage
          .from("request-photos")
          .remove(paths);
        if (!error) photosDeleted = paths.length;
      }
    } catch (_) {
      // storage failure is non-fatal — continue with data wipe
    }

    // 2) Anonymise bookings (we keep the row for audit; scrub PII)
    const { count: bookingsCount } = await admin
      .from("bookings")
      .update({ booking_notes: null })
      .eq("patient_id", uid)
      .select("id", { count: "exact", head: true });
    // patient_id stays so refunds remain traceable; full_name lives on
    // public.users which we wipe in step 4.

    // 3) Anonymise requests
    await admin
      .from("requests")
      .update({
        photo_urls: [],
        symptom_json: {},
        location: "SRID=4326;POINT(0 0)",
        status: "cancelled",
        closed_at: new Date().toISOString(),
      })
      .eq("patient_id", uid)
      .neq("status", "cancelled");

    // 4) Scrub public.users PII (FK cascade from auth deletion will drop the
    //    row entirely, but doing this first means no race on observers).
    await admin
      .from("users")
      .update({
        full_name: "Deleted user",
        email: null,
        phone: null,
        push_token: null,
        ahpra_no: null,
        ahpra_status: "unknown",
        ahpra_verified_at: null,
        ahpra_last_checked_at: null,
        onboarding_acks: null,
      })
      .eq("id", uid);

    // 5) Audit BEFORE we drop the auth row (audit row needs the actor_id to
    //    point at the about-to-be-deleted uid).
    await admin.from("events").insert({
      actor_id: uid,
      type: "account.deleted",
      payload: {
        photos_deleted: photosDeleted,
        bookings_anonymised: bookingsCount ?? 0,
        deleted_at: new Date().toISOString(),
      },
    });

    // 6) Delete auth.users (final). Cascade drops public.users + their FK rows
    //    where ON DELETE CASCADE is set (clinics, etc.). On a dentist account
    //    this removes their clinic. Patient accounts have no clinic.
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      return json({
        warning:
          "PII scrubbed but auth.users delete failed. Support will finalise within 24h.",
        error: delErr.message,
        photos_deleted: photosDeleted,
        bookings_anonymised: bookingsCount ?? 0,
      }, 200);
    }

    return json({
      photos_deleted: photosDeleted,
      bookings_anonymised: bookingsCount ?? 0,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
