// ============================================================================
// purge-stale-data — daily cron that deletes >30-day-old photos + location
// ============================================================================
// Schedule (Supabase Dashboard → Edge Functions → Cron):
//   0 14 * * *   (every day at 14:00 UTC = midnight AEDT)
//
// What it does:
//   1. Calls public.purge_stale_request_data(30) — DB-side scrubs photo_urls,
//      location, and symptom_json. Returns the list of orphaned storage paths.
//   2. Deletes each of those paths from the 'request-photos' storage bucket.
//   3. Writes a summary audit row.
//
// Deploy:  supabase functions deploy purge-stale-data --no-verify-jwt
// Secrets: SUPABASE_SERVICE_ROLE_KEY, PURGE_CRON_SECRET
// Cron auth: send X-QMS-Cron-Secret header to prevent unauthorized invocation.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const expected = Deno.env.get("PURGE_CRON_SECRET");
    const got = req.headers.get("X-QMS-Cron-Secret");
    if (!expected || got !== expected) {
      return new Response("Forbidden", { status: 403 });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data, error } = await admin.rpc("purge_stale_request_data", {
      _older_than_days: 30,
    });
    if (error) return new Response(error.message, { status: 500 });

    const rows = (data ?? []) as Array<{
      request_id: string;
      photo_urls: string[];
    }>;

    let storageDeleted = 0;
    let storageFailed = 0;

    // Storage paths are stored as the object key inside the 'request-photos'
    // bucket: <patient_id>/<request_id>/<slot>.jpg. Older rows might be full
    // URLs; we strip the bucket prefix if present.
    const stripBucketPrefix = (u: string): string => {
      const marker = "/request-photos/";
      const i = u.indexOf(marker);
      return i >= 0 ? u.slice(i + marker.length) : u;
    };

    for (const row of rows) {
      const paths = (row.photo_urls ?? []).map(stripBucketPrefix);
      if (paths.length === 0) continue;
      const { error: rmErr } = await admin.storage
        .from("request-photos")
        .remove(paths);
      if (rmErr) {
        storageFailed += paths.length;
      } else {
        storageDeleted += paths.length;
      }
    }

    await admin.from("events").insert({
      actor_id: null,
      type: "data.purge_run",
      payload: {
        requests_scrubbed: rows.length,
        storage_deleted: storageDeleted,
        storage_failed: storageFailed,
        ran_at: new Date().toISOString(),
      },
    });

    return new Response(
      JSON.stringify({
        requests_scrubbed: rows.length,
        storage_deleted: storageDeleted,
        storage_failed: storageFailed,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "err", { status: 500 });
  }
});
