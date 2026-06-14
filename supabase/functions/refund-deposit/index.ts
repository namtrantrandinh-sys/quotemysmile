// ============================================================================
// refund-deposit — issue a Stripe refund against a booking's PaymentIntent
// ============================================================================
// Called from the app in two situations:
//   1. Patient cancels with >= cancellation_window_hours to spare ('cancel')
//   2. Dentist marks visit as attended ('attended') — deposit returned to
//      patient because they paid the in-clinic bill in full.
//
// The PI is updated with metadata.refund_reason so the
// stripe-deposit-webhook can map charge.refunded to the right deposit_status
// ('refunded' for cancel, 'credited' for attended).
//
// Auth: bearer token of the caller (patient for cancel, dentist for attended).
// Authorization is enforced via RLS on the bookings select that fetches the PI.
//
// Deploy:  supabase functions deploy refund-deposit
// Secrets: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type RefundReason = "cancel" | "attended";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { bookingId, reason } = (await req.json()) as {
      bookingId?: string;
      reason?: RefundReason;
    };
    if (!bookingId || !reason) {
      return json({ error: "bookingId and reason are required" }, 400);
    }
    if (reason !== "cancel" && reason !== "attended") {
      return json({ error: "reason must be 'cancel' or 'attended'" }, 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);

    // Use the caller's JWT to enforce RLS on read; use service role to update
    // the PI metadata + insert the audit event.
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    // RLS enforces visibility: patient sees own; dentist sees clinic's.
    const { data: booking, error: bErr } = await userClient
      .from("bookings")
      .select(
        "id, slot, deposit_amount, deposit_status, deposit_stripe_pi, cancellation_window_hours, platform_fee_cents",
      )
      .eq("id", bookingId)
      .maybeSingle();
    if (bErr || !booking) return json({ error: "Booking not found" }, 404);

    if (booking.deposit_status !== "paid") {
      return json({ error: `Cannot refund a deposit in state '${booking.deposit_status}'` }, 400);
    }
    if (!booking.deposit_stripe_pi) {
      return json({ error: "No PaymentIntent on this booking" }, 400);
    }

    // Cancellation eligibility check — only enforced for 'cancel'.
    if (reason === "cancel") {
      const hoursUntil =
        (new Date(booking.slot).getTime() - Date.now()) / 3600_000;
      if (hoursUntil < booking.cancellation_window_hours) {
        return json(
          {
            error: `Within ${booking.cancellation_window_hours}h cancellation window — deposit is forfeited, not refundable.`,
          },
          400,
        );
      }
    }

    // 1) Tag the PI with refund_reason so the webhook can map the
    //    charge.refunded event to the right deposit_status.
    await fetch(
      `https://api.stripe.com/v1/payment_intents/${booking.deposit_stripe_pi}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ "metadata[refund_reason]": reason }),
      },
    );

    // 2) Refund the FULL deposit on both 'attended' and 'cancel'.
    //    The platform_fee_cents on the booking is now an accrued debt the
    //    dentist owes us for the attended visit — collected via monthly
    //    invoicing, not deducted from the patient's deposit.
    const fee = booking.platform_fee_cents ?? 500;
    const refundCents = booking.deposit_amount;

    const refundBody: Record<string, string> = {
      payment_intent: booking.deposit_stripe_pi,
      "metadata[booking_id]": booking.id,
      "metadata[refund_reason]": reason,
    };
    if (reason === "attended") {
      // Tag the PI so accounting can reconcile the dentist's owed A$5.
      refundBody["metadata[dentist_fee_owed_cents]"] = String(fee);
    }

    // Idempotency key keeps double-clicks safe.
    const refundRes = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": `qms:refund:${booking.id}:${reason}`,
      },
      body: new URLSearchParams(refundBody),
    });
    const refund = await refundRes.json();
    if (refund.error) return json({ error: refund.error.message }, 400);

    // 3) Audit trail — webhook will flip deposit_status when Stripe confirms.
    //    For 'attended' we also log the dentist_fee_owed as a separate event
    //    so the monthly invoicer can sweep these into a single Stripe invoice
    //    per practitioner.
    await adminClient.from("events").insert({
      actor_id: user.id,
      type: "booking.refund_requested",
      payload: {
        booking_id: booking.id,
        reason,
        stripe_refund_id: refund.id,
        deposit_cents: booking.deposit_amount,
        refund_cents: refundCents,
      },
    });
    if (reason === "attended") {
      await adminClient.from("events").insert({
        actor_id: user.id,
        type: "dentist.fee_owed",
        payload: {
          booking_id: booking.id,
          amount_cents: fee,
          accrued_at: new Date().toISOString(),
        },
      });
    }

    return json({
      refundId: refund.id,
      status: refund.status,
      refundedCents: refundCents,
      dentistFeeOwedCents: reason === "attended" ? fee : 0,
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
