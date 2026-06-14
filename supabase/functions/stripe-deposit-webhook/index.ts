// ============================================================================
// stripe-deposit-webhook — flips booking.deposit_status when Stripe confirms
// ============================================================================
// Configure in Stripe Dashboard → Webhooks. Subscribe to:
//   - payment_intent.succeeded       → marks deposit_status='paid', status='confirmed'
//   - payment_intent.payment_failed  → marks 'failed'
//   - charge.refunded                → marks 'refunded', status='cancelled' (or
//                                       'credited' when the refund was triggered
//                                       by the dentist marking attended — we
//                                       carry that intent in PI metadata)
//
// Deploy:  supabase functions deploy stripe-deposit-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const enc = new TextEncoder();

/**
 * Stripe-compatible HMAC-SHA256 signature verification.
 * Header format: t=<unix_ts>,v1=<hmac_sha256_hex>
 * Signed payload: `${t}.${rawBody}`
 * Tolerance: 5 minutes.
 */
async function verifyStripeSignature(
  rawBody: string,
  sigHeader: string,
  secret: string,
): Promise<boolean> {
  const parts = Object.fromEntries(
    sigHeader.split(",").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    }),
  ) as { t?: string; v1?: string };

  if (!parts.t || !parts.v1) return false;
  const tsSec = parseInt(parts.t, 10);
  if (!Number.isFinite(tsSec)) return false;
  if (Math.abs(Date.now() / 1000 - tsSec) > 300) return false; // 5 min tolerance

  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${parts.t}.${rawBody}`),
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time compare
  if (expected.length !== parts.v1.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ parts.v1.charCodeAt(i);
  }
  return diff === 0;
}

Deno.serve(async (req) => {
  try {
    const sig = req.headers.get("stripe-signature");
    const rawBody = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!sig || !webhookSecret) {
      return new Response("Missing signature", { status: 400 });
    }

    const ok = await verifyStripeSignature(rawBody, sig, webhookSecret);
    if (!ok) return new Response("Invalid signature", { status: 400 });

    const event = JSON.parse(rawBody);
    const eventId: string | undefined = event.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // For PI events the object id is the PI id. For charge events we use
    // payment_intent on the charge object.
    const obj = event.data?.object ?? {};
    const piId: string | undefined = obj.payment_intent ?? obj.id;
    if (!piId) return new Response("No PI id", { status: 400 });

    // Idempotency check — skip if we've already processed this event id.
    // (Insert is deferred to the end so a failed processing run is retryable.)
    if (eventId) {
      const { data: seen } = await supabase
        .from("stripe_events")
        .select("id")
        .eq("id", eventId)
        .maybeSingle();
      if (seen) return new Response("Already processed", { status: 200 });
    }

    const refundReason: string | undefined = obj.metadata?.refund_reason;

    let depositNext: string | null = null;
    let bookingNext: string | null = null;

    if (event.type === "payment_intent.succeeded") {
      depositNext = "paid";
      bookingNext = "confirmed";
    } else if (event.type === "payment_intent.payment_failed") {
      depositNext = "failed";
    } else if (event.type === "charge.refunded") {
      // The refund-deposit fn tags PI metadata with refund_reason so the
      // webhook knows whether to mark 'refunded' (cancel) or 'credited' (visit
      // attended → returned to patient since they paid the bill in person).
      depositNext = refundReason === "attended" ? "credited" : "refunded";
      bookingNext = refundReason === "attended" ? "completed" : "cancelled";
    }

    if (!depositNext) return new Response("Ignored event", { status: 200 });

    const update: Record<string, unknown> = { deposit_status: depositNext };
    const now = new Date().toISOString();
    if (depositNext === "paid") update.deposit_paid_at = now;
    if (depositNext === "refunded" || depositNext === "credited") {
      update.deposit_refunded_at = now;
    }
    if (bookingNext) update.status = bookingNext;

    const { data: updated, error } = await supabase
      .from("bookings")
      .update(update)
      .eq("deposit_stripe_pi", piId)
      .select("id")
      .maybeSingle();

    if (error) return new Response(error.message, { status: 500 });

    // Dispatch push notifications for visible state transitions. Fire-and-forget.
    if (updated?.id && bookingNext) {
      const fnUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-booking-notification`;
      fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({ bookingId: updated.id, event: bookingNext }),
      }).catch(() => {});
    }

    // Mark the event as fully processed so Stripe retries are deduped.
    if (eventId) {
      await supabase
        .from("stripe_events")
        .insert({
          id: eventId,
          type: event.type,
          pi_id: piId,
          outcome: "processed",
        });
    }

    return new Response("ok", { status: 200 });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "err", { status: 500 });
  }
});
