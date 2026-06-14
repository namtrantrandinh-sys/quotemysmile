/**
 * Observability — Sentry wrapper.
 *
 * Reads EXPO_PUBLIC_SENTRY_DSN. If not set, falls back to console.
 *
 * Production setup:
 *   1. Create a NEW Sentry project for QuoteMySmile (NOT under any other org).
 *   2. Copy the DSN.
 *   3. Add `EXPO_PUBLIC_SENTRY_DSN=https://...` to .env.local.
 *   4. Restart the app.
 *
 * The Sentry SDK is dynamic-imported so missing-DSN does not crash the app
 * and lets us ship without it.
 */
type Ctx = Record<string, unknown>;

let sentry: any = null;
let initAttempted = false;

async function ensureInit() {
  if (initAttempted) return;
  initAttempted = true;
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!dsn) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod: any = await (Function("return import('@sentry/react-native')") as () => Promise<any>)();
    mod.init({
      dsn,
      tracesSampleRate: 0.2,
      enableAutoSessionTracking: true,
      environment: __DEV__ ? "dev" : "prod",
    });
    sentry = mod;
  } catch (e) {
    console.warn("[QMS] Sentry init failed", e);
  }
}

// Fire-and-forget init at module load
void ensureInit();

export function captureError(err: unknown, ctx?: Ctx) {
  const msg = err instanceof Error ? err.message : String(err);
  if (sentry) {
    sentry.captureException(err, ctx ? { extra: ctx } : undefined);
  } else {
    // eslint-disable-next-line no-console
    console.error("[QMS]", msg, ctx ?? {});
  }
}

export function captureEvent(name: string, ctx?: Ctx) {
  if (sentry) {
    sentry.captureMessage(name, { level: "info", extra: ctx });
  } else {
    // eslint-disable-next-line no-console
    console.log("[QMS]", name, ctx ?? {});
  }
}

export function setUserContext(user: { id: string; role?: string } | null) {
  if (!sentry) return;
  sentry.setUser(user ?? null);
}

/**
 * Drop a Sentry breadcrumb. These show up on the timeline of any future
 * captureError, which is how we make production crashes diagnosable.
 *
 * Use sparingly — one per meaningful state transition (booking confirmed,
 * payment intent created, AHPRA recheck started). Don't log on every render.
 */
export function breadcrumb(
  category: "booking" | "payment" | "ahpra" | "push" | "auth" | "quote" | "location",
  message: string,
  data?: Ctx,
  level: "info" | "warning" | "error" = "info",
) {
  if (sentry) {
    sentry.addBreadcrumb({ category, message, level, data });
  } else if (__DEV__) {
    // eslint-disable-next-line no-console
    console.log(`[qms:${category}] ${message}`, data ?? "");
  }
}
