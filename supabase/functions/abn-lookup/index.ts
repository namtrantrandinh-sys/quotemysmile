// ============================================================================
// abn-lookup — Supabase Edge Function
// ============================================================================
// Validates an Australian Business Number against the free ABR public API,
// then updates the calling user's clinic.abn_verified_at if valid.
//
// Auth: requires a logged-in dentist (Authorization: Bearer <jwt>).
//
// Deploy:  supabase functions deploy abn-lookup --project-ref mqlaoxcjebzsihiocmzm
// Env:     ABR_GUID  (set via: supabase secrets set ABR_GUID=...)
//          Free at https://abr.business.gov.au/Tools/WebServices
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { abn, clinicId } = await req.json();
    if (!abn || !clinicId) {
      return json({ error: "abn and clinicId required" }, 400);
    }

    const cleaned = String(abn).replace(/\s/g, "");
    if (!/^\d{11}$/.test(cleaned)) {
      return json({ error: "ABN must be 11 digits" }, 400);
    }

    const guid = Deno.env.get("ABR_GUID");
    if (!guid) return json({ error: "ABR_GUID not configured" }, 500);

    // Auth + rate limit (5/min per caller) — protects the ABR endpoint.
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
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const { data: allowed } = await admin.rpc("check_lookup_quota", {
      _caller: user.id,
      _fn: "abn-lookup",
      _max_per_min: 5,
    });
    if (allowed === false) {
      return json({ error: "Too many checks. Try again in a minute." }, 429);
    }

    // ABR JSON callback endpoint
    const url = `https://abr.business.gov.au/json/AbnDetails.aspx?abn=${cleaned}&guid=${guid}`;
    const r = await fetch(url);
    const text = await r.text();
    // ABR wraps response in callback(...) — unwrap
    const jsonText = text.replace(/^callback\(/, "").replace(/\);?$/, "");
    const abrData = JSON.parse(jsonText);

    if (abrData.Abn !== cleaned || abrData.AbnStatus !== "Active") {
      return json({ ok: false, reason: "ABN not active", abr: abrData });
    }

    // Update the clinic row — RLS will enforce caller owns it
    const { data, error } = await userClient
      .from("clinics")
      .update({ abn_verified_at: new Date().toISOString() })
      .eq("id", clinicId)
      .select("id, abn_verified_at")
      .single();

    if (error) return json({ error: error.message }, 403);

    return json({
      ok: true,
      clinic: data,
      tradingName: abrData.EntityName ?? abrData.MainName ?? null,
      gst: abrData.Gst,
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
