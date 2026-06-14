// ============================================================================
// stripe-create-customer — provision a Stripe Customer + SetupIntent
// ============================================================================
// Called from the dentist Settings → "Save card on file" action. We:
//   1. Look up or create a Stripe Customer for this dentist (cached on
//      public.users.stripe_customer_id).
//   2. Return a SetupIntent client_secret so the app can mount the Stripe
//      Payment Sheet in setup mode and save a default payment method.
//
// The saved card is then used by sweep-dentist-fees at month-end to charge
// the accrued A$5 platform fees.
//
// Deploy:  supabase functions deploy stripe-create-customer
// Secrets: STRIPE_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "STRIPE_SECRET_KEY not configured" }, 500);

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

    const {
      data: { user },
    } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    // Pull current profile (need email + name for the Stripe Customer)
    const { data: profile } = await admin
      .from("users")
      .select(
        "id, full_name, email, role, stripe_customer_id, ahpra_no",
      )
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return json({ error: "Profile not found" }, 404);
    if (profile.role !== "dentist") {
      return json(
        { error: "Only dentists need a card on file." },
        403,
      );
    }

    // 1) Create the Customer if we don't already have one.
    let customerId = profile.stripe_customer_id;
    if (!customerId) {
      const custRes = await fetch("https://api.stripe.com/v1/customers", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          // Idempotency: a retry from the same dentist can't make two customers.
          "Idempotency-Key": `qms:cust:${user.id}`,
        },
        body: new URLSearchParams({
          email: profile.email ?? user.email ?? "",
          name: profile.full_name ?? "",
          description: `QuoteMySmile dentist · ${profile.ahpra_no ?? ""}`,
          "metadata[qms_user_id]": user.id,
          "metadata[ahpra_no]": profile.ahpra_no ?? "",
        }),
      });
      const cust = await custRes.json();
      if (cust.error) return json({ error: cust.error.message }, 400);
      customerId = cust.id;
      await admin
        .from("users")
        .update({ stripe_customer_id: customerId })
        .eq("id", user.id);
    }

    // 2) SetupIntent so the Payment Sheet can save a card off-session.
    const siRes = await fetch("https://api.stripe.com/v1/setup_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId!,
        // Off-session usage so we can charge them at month-end.
        usage: "off_session",
        "automatic_payment_methods[enabled]": "true",
        "metadata[qms_user_id]": user.id,
      }),
    });
    const si = await siRes.json();
    if (si.error) return json({ error: si.error.message }, 400);

    // Optional ephemeral key for Payment Sheet's "saved methods" list.
    const ekRes = await fetch("https://api.stripe.com/v1/ephemeral_keys", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": "2024-12-18.acacia",
      },
      body: new URLSearchParams({ customer: customerId! }),
    });
    const ek = await ekRes.json();

    return json({
      customerId,
      setupIntentClientSecret: si.client_secret,
      ephemeralKey: ek.secret ?? null,
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
