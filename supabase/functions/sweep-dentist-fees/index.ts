// ============================================================================
// sweep-dentist-fees — monthly invoicer for the A$5 platform fees
// ============================================================================
// Aggregates every 'dentist.fee_owed' event since the last sweep, groups by
// dentist (actor_id), and creates one Stripe Invoice per dentist for the
// total. The dentist's saved Stripe Customer is charged automatically the
// next time their default card is used (Stripe Billing).
//
// Schedule (Supabase Dashboard → Edge Functions → Cron):
//   30 1 1 * *   (1:30 AM local on the 1st of every month — staggered from
//                 the daily purge + hourly request-expiry crons)
//
// Auth: gated by X-QMS-Cron-Secret.
//
// Deploy:  supabase functions deploy sweep-dentist-fees --no-verify-jwt
// Secrets: SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, PURGE_CRON_SECRET
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const expected = Deno.env.get("PURGE_CRON_SECRET");
    const got = req.headers.get("X-QMS-Cron-Secret");
    if (!expected || got !== expected) {
      return new Response("Forbidden", { status: 403 });
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      return new Response("STRIPE_SECRET_KEY not configured", { status: 500 });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1) Determine the window: the previous calendar month, in UTC.
    const now = new Date();
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodStart = prev.toISOString();

    // 2) Pull all unswept fee events in the window.
    //    We tag swept events with payload.invoiced=true; rows without it are
    //    pending. (No row-level update flag column to avoid migrations.)
    const { data: feeEvents, error: feErr } = await admin
      .from("events")
      .select("id, actor_id, payload")
      .eq("type", "dentist.fee_owed")
      .gte("ts", periodStart)
      .lt("ts", periodEnd)
      .limit(5000);
    if (feErr) throw feErr;
    const unswept = (feeEvents ?? []).filter(
      (e) =>
        !(e.payload as { invoiced?: boolean } | null)?.invoiced &&
        e.actor_id != null,
    );
    if (unswept.length === 0) {
      return json({ invoices_created: 0, dentists: 0, period_start: periodStart });
    }

    // 3) Group by dentist.
    const byDentist = new Map<
      string,
      { cents: number; bookings: number; eventIds: number[] }
    >();
    for (const e of unswept) {
      const uid = e.actor_id as string;
      const fee = Number(
        (e.payload as { amount_cents?: number } | null)?.amount_cents ?? 0,
      );
      const slot = byDentist.get(uid) ?? { cents: 0, bookings: 0, eventIds: [] };
      slot.cents += fee;
      slot.bookings += 1;
      slot.eventIds.push(e.id);
      byDentist.set(uid, slot);
    }

    // 4) For each dentist: look up their Stripe customer (we cache it on
    //    public.users.stripe_customer_id). If none exists yet, skip — the
    //    fees stay unswept and will be picked up next month after they save
    //    a card on file in Settings.
    let invoicesCreated = 0;
    const results: Array<{
      user_id: string;
      cents: number;
      stripe_invoice_id?: string;
      skipped?: string;
    }> = [];

    for (const [uid, slot] of byDentist.entries()) {
      // dentist_profiles holds stripe_customer_id + full_name post-0027.
      // Email stays on the shared users row.
      const [dentRes, shellRes] = await Promise.all([
        admin
          .from("dentist_profiles")
          .select("stripe_customer_id, full_name")
          .eq("user_id", uid)
          .maybeSingle(),
        admin.from("users").select("email").eq("id", uid).maybeSingle(),
      ]);
      const dent = dentRes.data;
      const shell = shellRes.data;
      if (!dent?.stripe_customer_id) {
        results.push({
          user_id: uid,
          cents: slot.cents,
          skipped: "no_stripe_customer",
        });
        continue;
      }
      // Compatibility shim for the rest of the loop (still reads `user`).
      const user = {
        stripe_customer_id: dent.stripe_customer_id,
        email: shell?.email ?? null,
        full_name: dent.full_name ?? null,
      };

      // Create a Stripe invoice item for the total, then finalise.
      const month = prev.toLocaleString("en-AU", {
        month: "long",
        year: "numeric",
      });

      const itemRes = await fetch("https://api.stripe.com/v1/invoiceitems", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": `qms:fee:${uid}:${periodStart}`,
        },
        body: new URLSearchParams({
          customer: user.stripe_customer_id,
          amount: String(slot.cents),
          currency: "aud",
          description: `QuoteMySmile platform fees · ${month} · ${slot.bookings} attended booking${slot.bookings === 1 ? "" : "s"}`,
        }),
      });
      const item = await itemRes.json();
      if (item.error) {
        results.push({ user_id: uid, cents: slot.cents, skipped: item.error.message });
        continue;
      }

      const invRes = await fetch("https://api.stripe.com/v1/invoices", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${stripeKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
          "Idempotency-Key": `qms:inv:${uid}:${periodStart}`,
        },
        body: new URLSearchParams({
          customer: user.stripe_customer_id,
          collection_method: "charge_automatically",
          auto_advance: "true",
          "metadata[period_start]": periodStart,
          "metadata[bookings]": String(slot.bookings),
        }),
      });
      const invoice = await invRes.json();
      if (invoice.error) {
        results.push({ user_id: uid, cents: slot.cents, skipped: invoice.error.message });
        continue;
      }

      // Mark the fee events as invoiced so we don't double-bill next month.
      await admin
        .from("events")
        .update({ payload: { invoiced: true, stripe_invoice_id: invoice.id } })
        .in("id", slot.eventIds);

      invoicesCreated++;
      results.push({
        user_id: uid,
        cents: slot.cents,
        stripe_invoice_id: invoice.id,
      });
    }

    // 5) Audit run.
    await admin.from("events").insert({
      actor_id: null,
      type: "platform.fees_swept",
      payload: {
        period_start: periodStart,
        period_end: periodEnd,
        dentists: byDentist.size,
        invoices_created: invoicesCreated,
        ran_at: new Date().toISOString(),
        results,
      },
    });

    return json({
      invoices_created: invoicesCreated,
      dentists: byDentist.size,
      period_start: periodStart,
      period_end: periodEnd,
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "err", { status: 500 });
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
