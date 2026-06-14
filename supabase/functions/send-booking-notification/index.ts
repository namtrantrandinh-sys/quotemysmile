// ============================================================================
// send-booking-notification — push to patient + dentist on booking state change
// ============================================================================
// Called for: 'confirmed' (deposit succeeded), 'cancelled', 'completed',
// 'no_show'. The webhook + service-layer fns dispatch this fn.
//
// Deploy:  supabase functions deploy send-booking-notification
// Secrets: SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Event = "confirmed" | "cancelled" | "completed" | "no_show";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const { bookingId, event } = (await req.json()) as {
      bookingId?: string;
      event?: Event;
    };
    if (!bookingId || !event) {
      return json({ error: "bookingId and event required" }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: b } = await admin
      .from("bookings")
      .select(
        "id, slot, patient_id, clinic_id, quote_id, deposit_amount, deposit_status, clinics(name, address), quotes(dentist_name_at_quote, total)",
      )
      .eq("id", bookingId)
      .maybeSingle();
    if (!b) return json({ error: "Booking not found" }, 404);

    const { data: patient } = await admin
      .from("users")
      .select("push_token, email")
      .eq("id", b.patient_id)
      .maybeSingle();

    const { data: dentist } = await admin
      .from("clinics")
      .select("owner_user_id, users:owner_user_id(push_token)")
      .eq("id", b.clinic_id)
      .maybeSingle();
    const dentistToken =
      (dentist?.users as unknown as { push_token?: string } | null)
        ?.push_token ?? null;

    const slotLabel = new Date(b.slot).toLocaleString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
    });
    const clinicName = Array.isArray(b.clinics)
      ? (b.clinics[0] as { name?: string })?.name
      : (b.clinics as { name?: string } | null)?.name;
    const dentistName = Array.isArray(b.quotes)
      ? (b.quotes[0] as { dentist_name_at_quote?: string })
          ?.dentist_name_at_quote
      : (b.quotes as { dentist_name_at_quote?: string } | null)
          ?.dentist_name_at_quote;

    const messages = buildMessages({
      event,
      slotLabel,
      clinicName,
      dentistName,
      bookingId: b.id,
    });

    const targets: Array<{ token: string | null; payload: Msg }> = [
      { token: patient?.push_token ?? null, payload: messages.patient },
      { token: dentistToken, payload: messages.dentist },
    ];

    const results = await Promise.all(
      targets
        .filter((t) => !!t.token && !!t.payload)
        .map(async ({ token, payload }) => {
          const r = await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: token,
              sound: "default",
              title: payload.title,
              body: payload.body,
              data: { type: "booking", bookingId: b.id, event },
              priority: "high",
              channelId: "default",
            }),
          });
          return r.json();
        }),
    );

    await admin.from("events").insert({
      actor_id: b.patient_id,
      type: `booking.${event}_pushed`,
      payload: {
        booking_id: b.id,
        patient_email: patient?.email ?? null,
        results,
      },
    });

    // Transactional email — only to patient; dentist gets push only.
    if (patient?.email) {
      const html = renderEmail({
        event,
        slotLabel,
        clinicName,
        dentistName,
        clinicAddress: Array.isArray(b.clinics)
          ? (b.clinics[0] as { address?: string })?.address
          : (b.clinics as { address?: string } | null)?.address,
        depositAud: Math.round((b.deposit_amount ?? 0) / 100),
        depositStatus: b.deposit_status as string,
        bookingId: b.id,
      });
      if (html) {
        const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-email`;
        fetch(fnUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            to: patient.email,
            subject: html.subject,
            html: html.body,
            tag: `booking.${event}`,
            bookingId: b.id,
          }),
        }).catch(() => {});
      }
    }

    return json({ ok: true, results });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

type Msg = { title: string; body: string } | null;

function buildMessages(args: {
  event: Event;
  slotLabel: string;
  clinicName?: string;
  dentistName?: string;
  bookingId: string;
}): { patient: Msg; dentist: Msg } {
  const c = args.clinicName ?? "the clinic";
  const d = args.dentistName ?? "the dentist";
  switch (args.event) {
    case "confirmed":
      return {
        patient: {
          title: "Booking confirmed",
          body: `${args.slotLabel} with ${d} — deposit secured.`,
        },
        dentist: {
          title: "New booking",
          body: `${args.slotLabel} · deposit secured by QMS.`,
        },
      };
    case "cancelled":
      return {
        patient: {
          title: "Booking cancelled",
          body: `Your ${args.slotLabel} consult was cancelled.`,
        },
        dentist: {
          title: "Booking cancelled",
          body: `Patient cancelled the ${args.slotLabel} slot.`,
        },
      };
    case "completed":
      return {
        patient: {
          title: "Thanks for visiting",
          body: `Your deposit is being refunded in full. Leave ${d} a review?`,
        },
        dentist: {
          title: "Visit marked attended",
          body: `Deposit refunded in full to patient. A$5 platform fee accrued on your monthly invoice.`,
        },
      };
    case "no_show":
      return {
        patient: {
          title: "Marked as no-show",
          body: `The ${args.slotLabel} consult at ${c} was marked no-show. Deposit forfeited.`,
        },
        dentist: null,
      };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/* -------------------------------------------------------------------------- */
/* Email rendering — minimal editorial HTML, inline-styled for client compat. */
/* -------------------------------------------------------------------------- */

function renderEmail(args: {
  event: Event;
  slotLabel: string;
  clinicName?: string;
  dentistName?: string;
  clinicAddress?: string;
  depositAud: number;
  depositStatus: string;
  bookingId: string;
}): { subject: string; body: string } | null {
  const clinic = args.clinicName ?? "the clinic";
  const dentist = args.dentistName ?? "your dentist";
  const dep = args.depositAud > 0 ? `A$${args.depositAud}` : null;

  let subject = "";
  let lead = "";
  let detail = "";

  switch (args.event) {
    case "confirmed":
      subject = `Booking confirmed — ${args.slotLabel}`;
      lead = "You're booked.";
      detail = `${args.slotLabel} with ${dentist} at ${clinic}.${
        dep ? ` Your ${dep} deposit is secured and will be returned when you attend.` : ""
      }`;
      break;
    case "cancelled":
      subject = "Booking cancelled";
      lead = "Booking cancelled.";
      detail = `Your ${args.slotLabel} consult was cancelled. ${
        args.depositStatus === "refunded"
          ? `Your ${dep} deposit will appear back on your card within 5 business days.`
          : args.depositStatus === "forfeited"
            ? `Your ${dep} deposit was forfeited as per the cancellation policy.`
            : ""
      }`;
      break;
    case "completed":
      subject = "Thanks for visiting";
      lead = "Thanks for visiting.";
      detail = `We hope the consult with ${dentist} went well.${
        dep
          ? ` Your ${dep} deposit has been refunded in full — back to your card within 5 business days.`
          : ""
      } If you have a minute, we'd love a quick review.`;
      break;
    case "no_show":
      subject = "Marked as no-show";
      lead = "Marked as no-show.";
      detail = `Your ${args.slotLabel} consult at ${clinic} was marked as a no-show.${
        dep ? ` The ${dep} deposit was forfeited.` : ""
      } If you believe this was a mistake, reply to this email and we'll review.`;
      break;
    default:
      return null;
  }

  const body = `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#F5F1E8;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#2A2520;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F5F1E8;padding:40px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="560" style="background:#FAF6EC;border:1px solid #E8E0CD;">
            <tr><td style="padding:40px 40px 12px;text-align:center;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:28px;letter-spacing:0.16em;color:#2A2520;text-transform:uppercase;">QUOTE&nbsp;<span style="font-style:italic;color:#C9A961;letter-spacing:0;">my</span>&nbsp;SMILE</div>
            </td></tr>
            <tr><td style="padding:24px 40px 8px;">
              <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#8A7E6F;">Booking</div>
            </td></tr>
            <tr><td style="padding:0 40px 16px;">
              <div style="font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.12;color:#2A2520;">${lead}</div>
            </td></tr>
            <tr><td style="padding:0 40px 28px;">
              <p style="margin:0;font-size:15px;line-height:1.6;color:#4D423A;">${detail}</p>
            </td></tr>
            ${
              args.clinicAddress
                ? `<tr><td style="padding:0 40px 28px;">
                <div style="border-top:1px solid #E8E0CD;padding-top:18px;">
                  <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#8A7E6F;margin-bottom:6px;">Clinic</div>
                  <div style="font-size:14px;color:#2A2520;">${clinic}</div>
                  <div style="font-size:13px;color:#4D423A;margin-top:2px;">${args.clinicAddress}</div>
                </div>
              </td></tr>`
                : ""
            }
            <tr><td style="padding:0 40px 36px;">
              <div style="font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:#8A7E6F;">Booking #${args.bookingId.slice(0, 8)}</div>
            </td></tr>
            <tr><td style="padding:24px 40px 36px;border-top:1px solid #E8E0CD;">
              <p style="margin:0;font-size:11px;line-height:1.6;color:#8A7E6F;">
                QuoteMySmile is an introduction marketplace. Final clinical fees
                and treatment decisions remain between you and your chosen dentist.
                Reply to this email or write to support@quotemysmile.com.au.
              </p>
            </td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return { subject, body };
}
