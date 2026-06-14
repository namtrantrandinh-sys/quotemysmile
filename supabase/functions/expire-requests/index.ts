// ============================================================================
// expire-requests — hourly cron that closes timed-out requests
// ============================================================================
// State machine (from migration 0001):
//   open           → broadcast, accepting quotes
//   patient_review → quote window closed, patient still can book (7 days)
//   expired        → 7-day review window passed without booking
//
// This fn runs hourly and:
//   - Flips status=open → status=patient_review when closes_at < now()
//   - Flips status=patient_review → status=expired when 7 days have passed
//   - Marks any quotes still 'live' on those expired requests as 'expired'
//
// Schedule (Supabase Dashboard → Edge Functions → Cron):
//   3 * * * *    (every hour at minute 3 — staggered from purge-stale-data)
//
// Auth: gated by X-QMS-Cron-Secret to prevent unauthorised invocation.
//
// Deploy:  supabase functions deploy expire-requests --no-verify-jwt
// Secrets: SUPABASE_SERVICE_ROLE_KEY, PURGE_CRON_SECRET
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

    const now = new Date().toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600_000).toISOString();

    // 1) open → patient_review when the window closed
    const { data: toReview, error: e1 } = await admin
      .from("requests")
      .update({ status: "patient_review" })
      .eq("status", "open")
      .lt("closes_at", now)
      .select("id");
    if (e1) throw e1;

    // 2) patient_review → expired when the 7-day review window passed.
    //    We use closed_at (set by the 0013 trigger) as the timestamp.
    const { data: toExpire, error: e2 } = await admin
      .from("requests")
      .update({ status: "expired" })
      .eq("status", "patient_review")
      .lt("closed_at", sevenDaysAgo)
      .select("id");
    if (e2) throw e2;

    // 3) Cascade: any quote still 'live' on an expired request becomes 'expired'
    const expiredIds = (toExpire ?? []).map((r) => r.id);
    let expiredQuotesCount = 0;
    if (expiredIds.length > 0) {
      const { count } = await admin
        .from("quotes")
        .update({ status: "expired" })
        .in("request_id", expiredIds)
        .eq("status", "live")
        .select("id", { count: "exact", head: true });
      expiredQuotesCount = count ?? 0;
    }

    // 4) Audit
    await admin.from("events").insert({
      actor_id: null,
      type: "requests.expiry_run",
      payload: {
        to_review: toReview?.length ?? 0,
        to_expire: toExpire?.length ?? 0,
        expired_quotes: expiredQuotesCount,
        ran_at: now,
      },
    });

    return new Response(
      JSON.stringify({
        to_review: toReview?.length ?? 0,
        to_expire: toExpire?.length ?? 0,
        expired_quotes: expiredQuotesCount,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "err", { status: 500 });
  }
});
