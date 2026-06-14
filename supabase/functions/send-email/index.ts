// ============================================================================
// send-email — transactional email via Resend
// ============================================================================
// Generic sender used by other edge fns (booking-confirmation, refund-receipt,
// account-deletion-confirm, etc.). Keep this single point so the From address
// + DKIM + audit trail are consistent.
//
// Deploy:  supabase functions deploy send-email
// Secrets: RESEND_API_KEY, SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FROM_DEFAULT = "QuoteMySmile <hello@mail.quotemysmile.com.au>";
const REPLY_TO = "support@quotemysmile.com.au";

type Body = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  tag?: string;
  bookingId?: string;
  quoteId?: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) return json({ error: "RESEND_API_KEY not configured" }, 500);

    const body = (await req.json()) as Body;
    if (!body.to || !body.subject || (!body.html && !body.text)) {
      return json({ error: "to, subject, html|text required" }, 400);
    }

    const recipients = Array.isArray(body.to) ? body.to : [body.to];

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: body.from ?? FROM_DEFAULT,
        to: recipients,
        reply_to: REPLY_TO,
        subject: body.subject,
        html: body.html,
        text: body.text,
        tags: body.tag
          ? [{ name: "category", value: body.tag }]
          : undefined,
      }),
    });
    const out = await res.json();
    if (!res.ok) {
      return json({ error: out?.message ?? "Resend error", detail: out }, res.status);
    }

    // Audit
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    await admin.from("events").insert({
      actor_id: null,
      type: "email.sent",
      payload: {
        to: recipients,
        subject: body.subject,
        tag: body.tag ?? null,
        booking_id: body.bookingId ?? null,
        quote_id: body.quoteId ?? null,
        resend_id: out?.id ?? null,
      },
    });

    return json({ id: out.id });
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
