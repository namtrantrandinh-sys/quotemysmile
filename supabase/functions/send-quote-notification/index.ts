// ============================================================================
// send-quote-notification — push to the patient when a dentist quotes
// ============================================================================
// Called from the dentist app right after a successful submitQuote (or from a
// pg trigger via pg_net if you prefer the trigger route). We resolve the
// patient's Expo push token via service-role, then deliver via Expo's push
// HTTP/2 endpoint.
//
// Deploy:  supabase functions deploy send-quote-notification
// Secrets: SUPABASE_SERVICE_ROLE_KEY
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
    const { quoteId, kind } = (await req.json()) as {
      quoteId?: string;
      kind?: "new" | "requote";
    };
    if (!quoteId) return json({ error: "quoteId required" }, 400);

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

    // Caller must be the dentist who owns the quote (RLS check).
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Not authenticated" }, 401);

    const { data: q, error: qErr } = await userClient
      .from("quotes")
      .select(
        "id, total, request_id, dentist_name_at_quote, clinic_id, clinics(name)",
      )
      .eq("id", quoteId)
      .maybeSingle();
    if (qErr || !q) return json({ error: "Quote not visible to caller" }, 404);

    // Resolve patient + token via service role.
    const { data: request } = await adminClient
      .from("requests")
      .select("id, patient_id, status")
      .eq("id", q.request_id)
      .maybeSingle();
    if (!request) return json({ error: "Request not found" }, 404);
    if (request.status !== "open") {
      return json({ skipped: "request closed" });
    }

    const { data: patient } = await adminClient
      .from("users")
      .select("push_token")
      .eq("id", request.patient_id)
      .maybeSingle();
    if (!patient?.push_token) return json({ skipped: "no push token" });

    const clinicName = Array.isArray(q.clinics)
      ? (q.clinics[0] as { name?: string })?.name
      : (q.clinics as { name?: string } | null)?.name;

    const body =
      kind === "requote"
        ? `${q.dentist_name_at_quote} updated their quote — A$${q.total}`
        : `${q.dentist_name_at_quote} just sent A$${q.total}`;

    const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to: patient.push_token,
        sound: "default",
        title: kind === "requote" ? "Quote updated" : "New live quote",
        body,
        data: {
          type: "quote",
          quoteId: q.id,
          requestId: q.request_id,
          deeplink: `qms://quote/${q.id}`,
        },
        priority: "high",
        channelId: "default",
      }),
    });
    const expoJson = await expoRes.json();

    // Audit
    await adminClient.from("events").insert({
      actor_id: user.id,
      request_id: q.request_id,
      type: kind === "requote" ? "quote.requote_pushed" : "quote.new_pushed",
      payload: {
        quote_id: q.id,
        total_cents: q.total,
        clinic: clinicName,
        push_response: expoJson,
      },
    });

    return json({ ok: true, expo: expoJson });
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
