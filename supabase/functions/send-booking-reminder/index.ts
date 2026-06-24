// ============================================================================
// send-booking-reminder — fires push + SMS + email reminders to patients
// ============================================================================
// Triggered by pg_cron every 30 minutes (see migration 0029).
//
// Reminder tiers:
//   "t48h"   — between 46h and 50h before the slot
//   "t2h"    — between 2h and 4h before the slot
//
// The bookings.reminders_sent array records every tier already dispatched so
// a re-run can't double-send.
//
// Auth: X-QMS-Cron-Secret matches the Supabase Vault secret (shared with
// sweep-dentist-fees). Deploy with --no-verify-jwt.
//
// Secrets:
//   SUPABASE_SERVICE_ROLE_KEY  — admin client
//   PURGE_CRON_SECRET          — header gate value
//   TWILIO_ACCOUNT_SID         — optional; if absent, SMS is skipped
//   TWILIO_AUTH_TOKEN          — optional; if absent, SMS is skipped
//   TWILIO_FROM_NUMBER         — optional; if absent, SMS is skipped
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-qms-cron-secret",
};

type ReminderTier = "t48h" | "t2h";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Auth — pg_cron passes the shared vault secret in this header.
  const expected = Deno.env.get("PURGE_CRON_SECRET");
  const received = req.headers.get("x-qms-cron-secret");
  if (!expected || received !== expected) {
    return json({ error: "forbidden" }, 403);
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = new Date();
  const ms = (h: number) => h * 3_600_000;

  // Pull confirmed bookings whose slot is somewhere in the 50h horizon ahead.
  // RLS is bypassed via the service role key.
  const horizonEnd = new Date(now.getTime() + ms(50)).toISOString();
  const horizonStart = new Date(now.getTime() + ms(1)).toISOString();

  const { data: bookings, error } = await admin
    .from("bookings")
    .select(
      "id, slot, patient_id, clinic_id, deposit_status, reminders_sent, clinics(name, address), quotes(dentist_name_at_quote)",
    )
    .eq("status", "confirmed")
    .gte("slot", horizonStart)
    .lte("slot", horizonEnd);

  if (error) {
    return json({ error: error.message }, 500);
  }

  const results: Array<Record<string, unknown>> = [];

  for (const b of bookings ?? []) {
    const slotMs = new Date(b.slot as string).getTime();
    const hoursAway = (slotMs - now.getTime()) / 3_600_000;

    let tier: ReminderTier | null = null;
    if (hoursAway >= 46 && hoursAway <= 50) tier = "t48h";
    else if (hoursAway >= 2 && hoursAway <= 4) tier = "t2h";
    if (!tier) continue;
    if (((b.reminders_sent as string[] | null) ?? []).includes(tier)) continue;

    const clinicName = Array.isArray(b.clinics)
      ? (b.clinics[0] as { name?: string })?.name
      : (b.clinics as { name?: string } | null)?.name;
    const clinicAddress = Array.isArray(b.clinics)
      ? (b.clinics[0] as { address?: string })?.address
      : (b.clinics as { address?: string } | null)?.address;
    const dentistName = Array.isArray(b.quotes)
      ? (b.quotes[0] as { dentist_name_at_quote?: string })
          ?.dentist_name_at_quote
      : (b.quotes as { dentist_name_at_quote?: string } | null)
          ?.dentist_name_at_quote;

    const slotLabel = new Date(b.slot as string).toLocaleString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });

    const { title, body, smsBody } = composeMessage(tier, {
      slotLabel,
      clinicName: clinicName ?? "the clinic",
      dentistName: dentistName ?? "your dentist",
    });

    const { data: patient } = await admin
      .from("users")
      .select("push_token, email, phone")
      .eq("id", b.patient_id as string)
      .maybeSingle();

    const dispatched: Record<string, unknown> = { tier, bookingId: b.id };

    // Push via Expo
    if (patient?.push_token) {
      const resp = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          to: patient.push_token,
          sound: "default",
          title,
          body,
          data: { type: "booking_reminder", bookingId: b.id, tier },
          priority: "high",
          channelId: "default",
        }),
      });
      dispatched.push = await resp.json().catch(() => null);
    }

    // SMS via Twilio (optional)
    const twSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twFrom = Deno.env.get("TWILIO_FROM_NUMBER");
    if (twSid && twToken && twFrom && patient?.phone) {
      const auth = btoa(`${twSid}:${twToken}`);
      const form = new URLSearchParams({
        To: patient.phone,
        From: twFrom,
        Body: smsBody,
      });
      const resp = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${twSid}/Messages.json`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: form.toString(),
        },
      );
      dispatched.sms = { status: resp.status };
    }

    // Email via send-email edge fn
    if (patient?.email) {
      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`;
      const emailResp = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          to: patient.email,
          subject: `Reminder — ${slotLabel} with ${dentistName}`,
          html: renderEmail({
            tier,
            slotLabel,
            clinicName: clinicName ?? "the clinic",
            clinicAddress,
            dentistName: dentistName ?? "your dentist",
            bookingId: b.id as string,
          }),
          tag: `booking.reminder.${tier}`,
          bookingId: b.id,
        }),
      }).catch(() => null);
      dispatched.email = emailResp ? { status: emailResp.status } : null;
    }

    // Mark this tier sent so the next 30-min run skips this booking.
    const updated = [
      ...(((b.reminders_sent as string[] | null) ?? []) as string[]),
      tier,
    ];
    await admin
      .from("bookings")
      .update({ reminders_sent: updated })
      .eq("id", b.id as string);

    await admin.from("events").insert({
      actor_id: b.patient_id,
      type: `booking.reminder_${tier}`,
      payload: dispatched,
    });

    results.push(dispatched);
  }

  return json({ ok: true, sent: results.length, results });
});

function composeMessage(
  tier: ReminderTier,
  args: { slotLabel: string; clinicName: string; dentistName: string },
): { title: string; body: string; smsBody: string } {
  if (tier === "t48h") {
    return {
      title: "Consult in 2 days",
      body: `${args.slotLabel} with ${args.dentistName} at ${args.clinicName}.`,
      smsBody: `QuoteMySmile — reminder: ${args.slotLabel} with ${args.dentistName} at ${args.clinicName}. Manage in app: qms://booking. Reply STOP to opt out.`,
    };
  }
  return {
    title: "Consult in a few hours",
    body: `${args.slotLabel} with ${args.dentistName} at ${args.clinicName}.`,
    smsBody: `QuoteMySmile — today: ${args.slotLabel} with ${args.dentistName}, ${args.clinicName}. Reply STOP to opt out.`,
  };
}

function renderEmail(args: {
  tier: ReminderTier;
  slotLabel: string;
  clinicName: string;
  clinicAddress?: string;
  dentistName: string;
  bookingId: string;
}): string {
  const lead = args.tier === "t48h" ? "See you in two days." : "See you today.";
  return `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#F5F1E8;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#2A2520;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1E8;padding:40px 0;">
  <tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="background:#FAF6EC;border:1px solid #E8E0CD;">
      <tr><td style="padding:40px 40px 12px;text-align:center;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;letter-spacing:0.16em;color:#2A2520;text-transform:uppercase;">QUOTE&nbsp;<span style="font-style:italic;color:#C9A961;letter-spacing:0;">my</span>&nbsp;SMILE</div>
      </td></tr>
      <tr><td style="padding:24px 40px 8px;">
        <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A7E6F;">Reminder</div>
      </td></tr>
      <tr><td style="padding:0 40px 16px;">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.12;color:#2A2520;">${lead}</div>
      </td></tr>
      <tr><td style="padding:0 40px 28px;">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#4D423A;">${args.slotLabel} with ${args.dentistName} at ${args.clinicName}.${args.clinicAddress ? ` <br/><span style="color:#8A7E6F;">${args.clinicAddress}</span>` : ""}</p>
      </td></tr>
      <tr><td style="padding:0 40px 36px;">
        <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#8A7E6F;">Booking #${args.bookingId.slice(0, 8)}</div>
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
