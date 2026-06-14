// ============================================================================
// create-deposit-intent — Stripe PaymentIntent for booking deposit
// ============================================================================
// Called by the patient app when they pick a slot in /book.
// Returns the Stripe PaymentIntent client_secret so the app can mount the
// Stripe Payment Sheet. The booking row is created in 'pending' state with the
// Stripe PI id; the deposit-confirmed webhook flips it to 'paid' once Stripe
// confirms.
//
// Auth: requires logged-in patient.
//
// Deploy:  supabase functions deploy create-deposit-intent
// Secrets: STRIPE_SECRET_KEY  (sk_test_... or sk_live_...)
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
    const { quoteId, requestId, slotIso, depositCents } = await req.json();
    if (!quoteId || !requestId || !slotIso || !depositCents) {
      return json({ error: "quoteId, requestId, slotIso, depositCents required" }, 400);
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") ?? "" },
        },
      },
    );

    // Verify caller
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    // Look up the quote to get the clinic + dentist
    const { data: quote, error: qErr } = await supabase
      .from("quotes")
      .select("id, clinic_id, dentist_id, total")
      .eq("id", quoteId)
      .maybeSingle();
    if (qErr || !quote) return json({ error: "Quote not found" }, 404);

    // Idempotency: a retry from the same patient on the same quote+slot must
    // not create a second PaymentIntent. Stripe dedupes by Idempotency-Key.
    const idemKey = `qms:dep:${user.id}:${quoteId}:${slotIso}`;

    // Create the Stripe PaymentIntent
    const stripeRes = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Idempotency-Key": idemKey,
      },
      body: new URLSearchParams({
        amount: String(depositCents),
        currency: "aud",
        "automatic_payment_methods[enabled]": "true",
        description: `QuoteMySmile booking deposit · quote ${quoteId.slice(0, 8)}`,
        "metadata[quote_id]": quoteId,
        "metadata[request_id]": requestId,
        "metadata[patient_id]": user.id,
        "metadata[clinic_id]": quote.clinic_id,
        "metadata[slot_iso]": slotIso,
      }),
    });
    const intent = await stripeRes.json();
    if (intent.error) return json({ error: intent.error.message }, 400);

    // Insert booking row in 'pending' state (deposit not yet captured)
    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .insert({
        request_id: requestId,
        quote_id: quoteId,
        clinic_id: quote.clinic_id,
        patient_id: user.id,
        slot: slotIso,
        status: "pending_deposit",
        deposit_amount: depositCents,
        deposit_status: "pending",
        deposit_stripe_pi: intent.id,
      })
      .select("id")
      .single();

    if (bErr) return json({ error: bErr.message }, 400);

    return json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      bookingId: booking.id,
      depositCents,
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
