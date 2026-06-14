// ============================================================================
// smoke-test-edge-fns.ts — quick liveness check for every deployed edge fn
// ============================================================================
// Run:  deno run --allow-net --allow-env scripts/smoke-test-edge-fns.ts
//
// What it checks:
//   - Each fn responds within 8 s
//   - Auth-gated fns return 401 (not 5xx) when called without a JWT
//   - Stripe webhook returns 400 (not 500) when called without a signature
//   - Cron fn returns 403 without the secret header
//   - send-email returns 400 (validation) with empty body
//
// What it does NOT do:
//   - Issue real Stripe / Resend / Expo calls (would charge / email / push)
//   - Touch production data
// ============================================================================

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
  ?? "https://mqlaoxcjebzsihiocmzm.supabase.co";
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

type Expect = { status: number | number[]; label: string };
type Case = {
  fn: string;
  method?: "POST" | "GET";
  body?: unknown;
  headers?: Record<string, string>;
  expect: Expect;
};

const cases: Case[] = [
  // Auth-required: should reject anonymous with 401
  { fn: "abn-lookup", body: { abn: "12345678901", clinicId: "x" }, expect: { status: [401, 400], label: "rejects anon (401) or rejects payload (400)" } },
  { fn: "ahpra-lookup", body: { ahpraNo: "DEN0000000000" }, expect: { status: [401, 400], label: "rejects anon or payload" } },
  { fn: "create-deposit-intent", body: {}, expect: { status: [400, 401], label: "rejects empty payload" } },
  { fn: "refund-deposit", body: {}, expect: { status: [400, 401], label: "rejects empty payload" } },
  { fn: "send-quote-notification", body: {}, expect: { status: [400, 401], label: "rejects empty payload" } },
  { fn: "send-booking-notification", body: {}, expect: { status: [400, 401], label: "rejects empty payload" } },
  { fn: "send-email", body: {}, expect: { status: [400, 401], label: "rejects empty payload" } },

  // No-JWT: webhook needs Stripe signature
  { fn: "stripe-deposit-webhook", body: { test: 1 }, expect: { status: [400], label: "rejects without stripe-signature" } },

  // No-JWT: cron needs secret header
  { fn: "purge-stale-data", body: {}, expect: { status: [403], label: "rejects without X-QMS-Cron-Secret" } },
];

async function run() {
  let pass = 0;
  let fail = 0;
  const failures: string[] = [];

  console.log(`\nSmoke-testing ${cases.length} edge fns against ${SUPABASE_URL}\n`);

  for (const c of cases) {
    const url = `${SUPABASE_URL}/functions/v1/${c.fn}`;
    const t0 = performance.now();
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const r = await fetch(url, {
        method: c.method ?? "POST",
        headers: {
          "Content-Type": "application/json",
          ...(ANON ? { apikey: ANON } : {}),
          ...(c.headers ?? {}),
        },
        body: JSON.stringify(c.body ?? {}),
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      const ms = Math.round(performance.now() - t0);
      const expected = Array.isArray(c.expect.status)
        ? c.expect.status
        : [c.expect.status];
      const ok = expected.includes(r.status);

      if (ok) {
        pass++;
        console.log(`✓ ${c.fn.padEnd(30)} ${r.status}  ${ms}ms   ${c.expect.label}`);
      } else {
        fail++;
        const detail = `${c.fn} → ${r.status} (expected ${expected.join("|")}) — ${c.expect.label}`;
        failures.push(detail);
        const bodyText = await r.text().catch(() => "");
        console.log(`✗ ${c.fn.padEnd(30)} ${r.status}  ${ms}ms   ${c.expect.label}`);
        if (bodyText) console.log(`     ↳ ${bodyText.slice(0, 200)}`);
      }
    } catch (e) {
      fail++;
      const msg = e instanceof Error ? e.message : String(e);
      failures.push(`${c.fn}: ${msg}`);
      console.log(`✗ ${c.fn.padEnd(30)} ERROR  ${msg}`);
    }
  }

  console.log(`\n${pass} passed · ${fail} failed`);
  if (fail > 0) {
    console.log("\nFailures:");
    for (const f of failures) console.log("  - " + f);
    Deno.exit(1);
  }
}

await run();
