// ============================================================================
// ahpra-lookup — verifies AHPRA registration against the public register
// ============================================================================
// AHPRA does not publish an official JSON API, so we scrape the public register
// search page (https://www.ahpra.gov.au/Registration/Registers-of-Practitioners.aspx)
// for the practitioner's row. The scrape extracts:
//   - Full name (must match the registered name on file)
//   - Registration type (General / Specialist / Limited / Student / Non-Practising)
//   - Conditions/restrictions flag
//   - Suspension/cancellation flag
//
// On a clean match we set users.ahpra_verified_at + users.ahpra_reg_type, then
// promote the dentist to status='active' so they can begin quoting.
//
// IMPORTANT: AHPRA's terms permit individuals to check the register. Hitting
// it at automation scale needs an account-based agreement. For QMS prod we
// throttle to one call per dentist per 24h (cached in DB) and we always show
// the source URL in the audit row.
//
// Deploy:  supabase functions deploy ahpra-lookup
// Secrets: SUPABASE_SERVICE_ROLE_KEY
// ============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const AHPRA_SEARCH =
  "https://www.ahpra.gov.au/Registration/Registers-of-Practitioners/Public-Register-Search.aspx";

type RegType = "General" | "Specialist" | "Limited" | "Student" | "Non-Practising";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { ahpraNo, expectedName } = (await req.json()) as {
      ahpraNo?: string;
      expectedName?: string;
    };
    if (!ahpraNo) return json({ error: "ahpraNo required" }, 400);

    const cleaned = ahpraNo.trim().toUpperCase();
    if (!/^DEN\d{10}$/.test(cleaned)) {
      return json(
        { error: "AHPRA dental registration number must match DEN + 10 digits" },
        400,
      );
    }

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

    // Per-user rate limit (5/min) — protects us from getting banned by AHPRA
    const { data: allowed } = await admin.rpc("check_lookup_quota", {
      _caller: user.id,
      _fn: "ahpra-lookup",
      _max_per_min: 5,
    });
    if (allowed === false) {
      return json(
        { error: "Too many checks. Try again in a minute." },
        429,
      );
    }

    // 24-hour cache window — re-checks at most daily per practitioner
    const { data: existing } = await admin
      .from("users")
      .select("ahpra_verified_at, ahpra_reg_type, ahpra_status, ahpra_last_checked_at")
      .eq("id", user.id)
      .maybeSingle();

    const last = existing?.ahpra_last_checked_at
      ? new Date(existing.ahpra_last_checked_at).getTime()
      : 0;
    if (Date.now() - last < 24 * 3600_000) {
      return json({
        ok: existing?.ahpra_status === "active",
        cached: true,
        status: existing?.ahpra_status ?? "unknown",
        regType: existing?.ahpra_reg_type ?? null,
        verifiedAt: existing?.ahpra_verified_at ?? null,
      });
    }

    // Fetch the public-register search results page for this number.
    const url = `${AHPRA_SEARCH}?Number=${encodeURIComponent(cleaned)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "QuoteMySmile/1.0 (compliance check; support@quotemysmile.com.au)",
        Accept: "text/html",
      },
    });
    const html = await res.text();

    const parsed = parseAhpraResult(html);

    // Name match — case-insensitive, surname-anywhere check. AHPRA shows the
    // name as "Surname, Given Name(s)" so we tolerate either ordering.
    let nameOk = true;
    if (expectedName && parsed.name) {
      const norm = (s: string) =>
        s
          .toLowerCase()
          .replace(/[,.]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      const a = norm(expectedName);
      const b = norm(parsed.name);
      const surname = a.split(" ").pop() ?? "";
      nameOk = b.includes(surname);
    }

    const isActive =
      parsed.found &&
      parsed.regStatus === "Registered" &&
      !parsed.suspended &&
      !parsed.cancelled &&
      nameOk;

    const finalStatus: "active" | "conditional" | "suspended" | "not_found" =
      !parsed.found
        ? "not_found"
        : parsed.suspended || parsed.cancelled
          ? "suspended"
          : parsed.hasConditions
            ? "conditional"
            : isActive
              ? "active"
              : "not_found";

    const nowIso = new Date().toISOString();
    await admin
      .from("users")
      .update({
        ahpra_no: cleaned,
        ahpra_reg_type: parsed.regType ?? null,
        ahpra_status: finalStatus,
        ahpra_last_checked_at: nowIso,
        ahpra_verified_at: finalStatus === "active" ? nowIso : null,
      })
      .eq("id", user.id);

    await admin.from("events").insert({
      actor_id: user.id,
      type: "ahpra.checked",
      payload: {
        ahpra_no: cleaned,
        status: finalStatus,
        parsed,
        source_url: url,
        name_match: nameOk,
      },
    });

    return json({
      ok: finalStatus === "active",
      status: finalStatus,
      regType: parsed.regType,
      name: parsed.name,
      hasConditions: parsed.hasConditions,
      suspended: parsed.suspended,
      sourceUrl: url,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

/* -------------------------------------------------------------------------- */

function parseAhpraResult(html: string): {
  found: boolean;
  name: string | null;
  regType: RegType | null;
  regStatus: string | null;
  hasConditions: boolean;
  suspended: boolean;
  cancelled: boolean;
} {
  // The AHPRA page renders a results table when found, or a "no results" string
  // when not. We do a tolerant text scrape — the markup changes occasionally
  // but the labels do not.
  const noResults = /No\s+results\s+found/i.test(html);
  if (noResults) {
    return {
      found: false,
      name: null,
      regType: null,
      regStatus: null,
      hasConditions: false,
      suspended: false,
      cancelled: false,
    };
  }

  const grab = (label: string): string | null => {
    const re = new RegExp(
      `${label}\\s*<\\/[^>]+>\\s*<[^>]+>\\s*([^<]+)`,
      "i",
    );
    const m = html.match(re);
    return m ? m[1].trim() : null;
  };

  const name = grab("Name") ?? grab("Practitioner name");
  const regStatus = grab("Registration\\s*Status") ?? grab("Status");
  const profession = grab("Profession");
  const division = grab("Division");

  const regType: RegType | null =
    division && /Specialist/i.test(division)
      ? "Specialist"
      : division && /Student/i.test(division)
        ? "Student"
        : division && /Limited/i.test(division)
          ? "Limited"
          : division && /Non-Practising/i.test(division)
            ? "Non-Practising"
            : profession && /Dental/i.test(profession)
              ? "General"
              : null;

  const suspended = /Suspended/i.test(html);
  const cancelled = /Cancelled/i.test(html);
  const hasConditions = /Conditions?\s*apply/i.test(html);

  return {
    found: !!name,
    name,
    regType,
    regStatus,
    hasConditions,
    suspended,
    cancelled,
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
