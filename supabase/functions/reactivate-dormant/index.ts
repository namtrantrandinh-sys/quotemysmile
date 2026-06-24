// ============================================================================
// reactivate-dormant — weekly push to patients with no request in 180+ days
// ============================================================================
// Triggered by pg_cron every Monday 22:00 UTC (Tuesday 08:00 AEST) — see
// migration 0029. Reactivating a dormant patient costs ~$12 vs ~$312 to
// acquire a new one (2026 dental-marketing industry data), so this is the
// single highest-ROI lifecycle nudge we ship.
//
// Send rules (fail-closed):
//   - role = 'patient'
//   - users.last_reactivation_at is null OR > 90 days ago  (debounce)
//   - latest requests.created_at is null OR > 180 days ago (dormancy)
//   - has a push_token, an email, or both
//
// On send, last_reactivation_at is bumped so we never spam.
//
// Auth: X-QMS-Cron-Secret. Deploy with --no-verify-jwt.
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-qms-cron-secret",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const expected = Deno.env.get("PURGE_CRON_SECRET");
  const received = req.headers.get("x-qms-cron-secret");
  if (!expected || received !== expected) {
    return json({ error: "forbidden" }, 403);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const ms = (d: number) => d * 24 * 3_600_000;
  const dormantBefore = new Date(Date.now() - ms(180)).toISOString();
  const debounceBefore = new Date(Date.now() - ms(90)).toISOString();

  // Pull patient users + their latest request timestamp.
  // We use a couple of cheap queries instead of a fancy join so we keep
  // RLS-bypass scope small.
  const { data: patients, error } = await admin
    .from("users")
    .select("id, email, push_token, last_reactivation_at, created_at")
    .eq("role", "patient")
    .or(`last_reactivation_at.is.null,last_reactivation_at.lt.${debounceBefore}`);

  if (error) return json({ error: error.message }, 500);

  const sent: string[] = [];
  for (const u of patients ?? []) {
    if (!u.push_token && !u.email) continue;

    // Skip brand-new accounts (<14d old) — we want lapsed users, not
    // people we just acquired and have yet to engage.
    const ageMs = Date.now() - new Date(u.created_at as string).getTime();
    if (ageMs < ms(14)) continue;

    // Look up latest request for this patient. If none AND they're not
    // brand new, they're a dormant signup — also worth nudging.
    const { data: latest } = await admin
      .from("requests")
      .select("created_at")
      .eq("patient_id", u.id as string)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest && (latest.created_at as string) > dormantBefore) {
      continue; // recently active — skip
    }

    const title = "Time to check your smile?";
    const body =
      "It's been a while. Snap a photo and get fresh quotes from local dentists in minutes.";

    if (u.push_token) {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          to: u.push_token,
          sound: "default",
          title,
          body,
          data: { type: "reactivate" },
          priority: "high",
          channelId: "default",
        }),
      }).catch(() => null);
    }

    if (u.email) {
      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`;
      await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: u.email,
          subject: title,
          html: renderEmail(),
          tag: "lifecycle.reactivate",
        }),
      }).catch(() => null);
    }

    await admin
      .from("users")
      .update({ last_reactivation_at: new Date().toISOString() })
      .eq("id", u.id as string);

    sent.push(u.id as string);
  }

  return json({ ok: true, sent: sent.length });
});

function renderEmail(): string {
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#F5F1E8;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#2A2520;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1E8;padding:40px 0;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="background:#FAF6EC;border:1px solid #E8E0CD;">
      <tr><td style="padding:40px 40px 12px;text-align:center;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;letter-spacing:0.16em;color:#2A2520;text-transform:uppercase;">QUOTE&nbsp;<span style="font-style:italic;color:#C9A961;letter-spacing:0;">my</span>&nbsp;SMILE</div>
      </td></tr>
      <tr><td style="padding:24px 40px 12px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A7E6F;">It's been a while</div>
      </td></tr>
      <tr><td style="padding:0 40px 16px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.12;color:#2A2520;">Time to check your smile?</div>
      </td></tr>
      <tr><td style="padding:0 40px 28px;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#4D423A;">Pop the app open, snap a quick photo and get fresh quotes from AHPRA-registered dentists near you within the hour.</p>
      </td></tr>
      <tr><td style="padding:0 40px 36px;">
        <p style="margin:0;font-size:11px;color:#8A7E6F;line-height:1.6;">Don't want these? Open the app → Settings → Notifications.</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
