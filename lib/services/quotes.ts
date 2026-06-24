import { supabase } from "@/lib/supabase";
import { breadcrumb, captureError } from "@/lib/observability";
import type { AdaItem } from "@/lib/types";

export type SubmitQuoteInput = {
  requestId: string;
  clinicId: string;
  total: number;
  items: AdaItem[];
  availabilitySlots: string[]; // ISO timestamps
  note?: string;
  // AHPRA defence — denormalised on the row
  ahpraNo: string;
  ahpraRegType: "General" | "Specialist";
  dentistNameAtQuote: string;
  emergencyPremiumPct?: number; // 0–50; transparently shown to the patient
};

export async function submitQuote(input: SubmitQuoteInput) {
  const nowIso = new Date().toISOString();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      request_id: input.requestId,
      clinic_id: input.clinicId,
      dentist_id: user.id,
      total: input.total,
      items_json: input.items,
      availability_slots: input.availabilitySlots,
      note: input.note ?? null,
      status: "live",
      requote_count: 0,
      ahpra_no: input.ahpraNo,
      ahpra_reg_type: input.ahpraRegType,
      dentist_name_at_quote: input.dentistNameAtQuote,
      emergency_premium_pct: input.emergencyPremiumPct ?? 0,
      ack_responsibility_at: nowIso,
      ack_photo_based_at: nowIso,
    })
    .select("id, total, status")
    .single();

  if (error) {
    captureError(error, { ctx: "submitQuote", requestId: input.requestId });
    throw error;
  }
  breadcrumb("quote", "submitQuote:ok", {
    quoteId: data.id,
    total: data.total,
  });

  // Fire-and-forget push to the patient. Failure must not block quote submit.
  void supabase.functions
    .invoke("send-quote-notification", {
      body: { quoteId: data.id, kind: "new" },
    })
    .catch(() => {});

  return data;
}

export type RequoteInput = {
  quoteId: string;
  newTotal: number;
  newItems: AdaItem[];
  newAvailabilitySlots: string[];
  newNote?: string;
};

export async function requoteOnce(input: RequoteInput) {
  // requote_count CHECK <= 1 + trigger locks the row to status=final
  // updated_at fires automatically.
  const { data, error } = await supabase
    .from("quotes")
    .update({
      previous_total: undefined, // set via .rpc if we wanted; keeping simple
      total: input.newTotal,
      items_json: input.newItems,
      availability_slots: input.newAvailabilitySlots,
      note: input.newNote ?? null,
      requote_count: 1,
    })
    .eq("id", input.quoteId)
    .eq("status", "live")
    .select("id, total, status, locked_at")
    .single();

  if (error) throw error;

  void supabase.functions
    .invoke("send-quote-notification", {
      body: { quoteId: data.id, kind: "requote" },
    })
    .catch(() => {});

  return data;
}

export async function listQuotesForRequest(requestId: string) {
  const { data, error } = await supabase
    .from("quotes")
    .select("*")
    .eq("request_id", requestId)
    .order("total", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getQuote(quoteId: string) {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id, request_id, clinic_id, dentist_id, total, previous_total, items_json, availability_slots, note, status, requote_count, ahpra_no, ahpra_reg_type, dentist_name_at_quote, emergency_premium_pct, clinics(name, address), requests(health_fund_json, closes_at)",
    )
    .eq("id", quoteId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Subscribe to live quote inserts + updates for a single request.
 * Returns the channel — call .unsubscribe() in cleanup.
 */
export function subscribeQuotesForRequest(
  requestId: string,
  onChange: (payload: unknown) => void,
) {
  return supabase
    .channel(`quotes:request:${requestId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "quotes",
        filter: `request_id=eq.${requestId}`,
      },
      onChange,
    )
    .subscribe();
}

/**
 * Fetch lat/lng for every clinic that quoted on this request.
 * Used by the patient-side map view.
 */
export async function clinicGeoForRequest(requestId: string) {
  const { data, error } = await supabase.rpc("clinic_geo_for_request", {
    _request_id: requestId,
  });
  if (error) throw error;
  return (data ?? []) as Array<{
    quote_id: string;
    total: number;
    clinic_name: string;
    lat: number;
    lng: number;
    status: string;
  }>;
}

/**
 * Typing-indicator broadcast over Supabase Realtime presence.
 * Use from a dentist's quote builder to show "Dr X is preparing a quote".
 */
export function broadcastTyping(requestId: string, dentistName: string) {
  const channel = supabase.channel(`quotes:request:${requestId}:typing`);
  channel
    .on("presence", { event: "sync" }, () => {})
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ name: dentistName, ts: Date.now() });
      }
    });
  return channel;
}

/**
 * Apple 1.2 — patient-submitted UGC report against a dentist quote.
 * Inserts into quote_reports; RLS scopes the row to the reporter.
 * Unique (quote_id, reporter_id) means duplicate reports return a
 * conflict error — the caller treats that as "already reported".
 */
export async function reportQuote(input: {
  quoteId: string;
  reason: string;
  detail?: string;
}): Promise<{ alreadyReported: boolean }> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sign in to report a quote.");
  const { error } = await supabase.from("quote_reports").insert({
    quote_id: input.quoteId,
    reporter_id: user.id,
    reason: input.reason.slice(0, 80),
    detail: input.detail?.slice(0, 2000) ?? null,
  });
  if (error) {
    // 23505 = unique_violation → user already reported this quote.
    if ((error as { code?: string }).code === "23505") {
      return { alreadyReported: true };
    }
    throw error;
  }
  breadcrumb("quote", "reportQuote:ok", { quoteId: input.quoteId });
  return { alreadyReported: false };
}

/**
 * Subscribe to who is typing on a request (presence sync).
 */
export function subscribeTyping(requestId: string, onChange: (names: string[]) => void) {
  const channel = supabase.channel(`quotes:request:${requestId}:typing`);
  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState() as Record<string, Array<{ name: string }>>;
      const names = Object.values(state).flat().map((p) => p.name);
      onChange(names);
    })
    .subscribe();
  return channel;
}
