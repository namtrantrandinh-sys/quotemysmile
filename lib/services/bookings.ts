import { supabase } from "@/lib/supabase";
import { breadcrumb, captureError } from "@/lib/observability";

export type CreateBookingInput = {
  requestId: string;
  quoteId: string;
  clinicId: string;
  slot: string; // ISO timestamp
};

/**
 * Calculate the booking-deposit tier for a quote total (in AUD dollars).
 *  Quote >= $500 → $100 deposit
 *  Quote >= $200 → $75 deposit
 *  Otherwise     → $50 deposit
 */
export function depositTierForQuote(quoteAud: number): number {
  if (quoteAud >= 500) return 100;
  if (quoteAud >= 200) return 75;
  return 50;
}

/**
 * Kick off a Stripe PaymentIntent for the booking deposit.
 * Creates a 'pending_deposit' booking row server-side and returns the
 * Stripe client secret + booking id for the patient app to confirm payment.
 */
export async function createDepositIntent(input: {
  quoteId: string;
  requestId: string;
  slotIso: string;
  depositAud: number;
}): Promise<{
  clientSecret: string;
  paymentIntentId: string;
  bookingId: string;
}> {
  breadcrumb("payment", "createDepositIntent:start", {
    quoteId: input.quoteId,
    depositAud: input.depositAud,
  });
  const { data, error } = await supabase.functions.invoke("create-deposit-intent", {
    body: {
      quoteId: input.quoteId,
      requestId: input.requestId,
      slotIso: input.slotIso,
      depositCents: input.depositAud * 100,
    },
  });
  if (error) {
    captureError(error, { ctx: "createDepositIntent", quoteId: input.quoteId });
    throw error;
  }
  breadcrumb("payment", "createDepositIntent:ok", {
    bookingId: (data as { bookingId?: string })?.bookingId,
  });
  return data as {
    clientSecret: string;
    paymentIntentId: string;
    bookingId: string;
  };
}

export async function createBooking(input: CreateBookingInput) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("bookings")
    .insert({
      request_id: input.requestId,
      quote_id: input.quoteId,
      clinic_id: input.clinicId,
      patient_id: user.id,
      slot: input.slot,
      status: "confirmed",
    })
    .select("id, slot, status")
    .single();

  if (error) throw error;
  return data;
}

export async function listMyBookings() {
  // Defense-in-depth: explicitly filter by patient_id even though RLS
  // already restricts to the signed-in patient. A misbehaving RLS rule
  // (e.g. during a future migration) would otherwise leak other patients'
  // bookings — the explicit filter prevents that.
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, slot, status, clinic_id, quote_id, request_id, clinics(name, address), quotes(total, dentist_name_at_quote)",
    )
    .eq("patient_id", userId)
    .order("slot", { ascending: true });
  if (error) throw error;
  return data;
}

/**
 * Dentist-side: list bookings into the dentist's own clinic.
 * Defense-in-depth: explicitly filter by the dentist's clinic_id rather
 * than relying only on RLS to scope rows.
 */
export async function listClinicBookings() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Not signed in");
  // Look up the dentist's clinic via clinics.owner_user_id. If the
  // dentist hasn't completed onboarding yet they own no clinic and we
  // return [] rather than letting the query fall back to RLS-only scope.
  const { data: clinic } = await supabase
    .from("clinics")
    .select("id")
    .eq("owner_user_id", userId)
    .maybeSingle();
  if (!clinic?.id) return [];
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, slot, status, clinic_id, quote_id, request_id, deposit_amount, deposit_status, quotes(total, dentist_name_at_quote)",
    )
    .eq("clinic_id", clinic.id)
    .order("slot", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getBooking(id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id, slot, status, clinic_id, quote_id, request_id, deposit_amount, deposit_status, deposit_paid_at, cancellation_window_hours, booking_notes, clinics(name, address), quotes(id, total, dentist_name_at_quote, items_json)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Patient-initiated cancellation.
 *  - Outside the cancellation window → Stripe refund via `refund-deposit`
 *    edge fn. The fn flips PI metadata and creates the refund; the
 *    stripe-deposit-webhook then sets deposit_status='refunded' +
 *    status='cancelled'.
 *  - Inside the window → no refund, just mark the booking cancelled and
 *    forfeit the deposit locally (audit trigger logs the event).
 */
export async function cancelBooking(bookingId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: booking, error: bErr } = await supabase
    .from("bookings")
    .select("id, slot, cancellation_window_hours, deposit_status")
    .eq("id", bookingId)
    .eq("patient_id", user.id)
    .maybeSingle();
  if (bErr || !booking) throw bErr || new Error("Booking not found");

  const hoursUntil =
    (new Date(booking.slot).getTime() - Date.now()) / 3600_000;
  const eligible = hoursUntil >= booking.cancellation_window_hours;

  if (eligible && booking.deposit_status === "paid") {
    breadcrumb("booking", "cancelBooking:refund_requested", {
      bookingId,
      hoursUntil,
    });
    const { error: fnErr } = await supabase.functions.invoke("refund-deposit", {
      body: { bookingId, reason: "cancel" },
    });
    if (fnErr) {
      captureError(fnErr, { ctx: "cancelBooking.refund", bookingId });
      throw fnErr;
    }
    // Optimistic — webhook will land deposit_status='refunded'.
    await supabase
      .from("bookings")
      .update({ status: "cancelled" })
      .eq("id", bookingId);
    return { refunded: true, forfeited: false };
  }

  // Inside window OR deposit never paid → forfeit / just cancel.
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      deposit_status:
        booking.deposit_status === "paid" ? "forfeited" : booking.deposit_status,
    })
    .eq("id", bookingId);
  if (error) throw error;

  void supabase.functions
    .invoke("send-booking-notification", {
      body: { bookingId, event: "cancelled" },
    })
    .catch(() => {});

  return { refunded: false, forfeited: booking.deposit_status === "paid" };
}

/**
 * Tidy up a booking row that was created server-side as part of the
 * deposit PaymentIntent but never actually paid (Stripe sheet cancelled,
 * sheet init failed, presentation failed). Marks the row as cancelled
 * with deposit_status='abandoned' so the slot is freed and the row
 * doesn't loiter as a pending mystery in the patient's inbox.
 *
 * Safe to call even if the booking has already been paid — the guard
 * skips when deposit_status moved past 'pending'.
 */
export async function abandonPendingBooking(bookingId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, deposit_status, status")
    .eq("id", bookingId)
    .eq("patient_id", user.id)
    .maybeSingle();
  if (!booking) return;
  // Only sweep rows that genuinely never paid. If Stripe confirmed in
  // the background after the user closed the sheet, leave the row alone.
  if (booking.deposit_status !== "pending") return;
  if (booking.status === "cancelled") return;
  await supabase
    .from("bookings")
    .update({ status: "cancelled", deposit_status: "abandoned" })
    .eq("id", bookingId)
    .eq("patient_id", user.id);
}

/**
 * Dentist marks the visit.
 *  - attended → kick off Stripe refund with reason='attended'. The webhook
 *    flips deposit_status='credited' once the refund clears. Patient pays
 *    the in-clinic bill in full, so the deposit is returned to them.
 *  - no_show → deposit forfeited (kept by QMS as no-show fee).
 */
export async function markAttended(bookingId: string, attended: boolean) {
  if (attended) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("deposit_status")
      .eq("id", bookingId)
      .maybeSingle();

    if (booking?.deposit_status === "paid") {
      breadcrumb("booking", "markAttended:refund_requested", { bookingId });
      const { error: fnErr } = await supabase.functions.invoke(
        "refund-deposit",
        { body: { bookingId, reason: "attended" } },
      );
      if (fnErr) {
        captureError(fnErr, { ctx: "markAttended.refund", bookingId });
        throw fnErr;
      }
      // Webhook will land deposit_status='credited' + status='completed'.
      return;
    }
    // Deposit not paid (shouldn't happen post-confirmation but be safe).
    const { error } = await supabase
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", bookingId);
    if (error) throw error;
    return;
  }

  // no-show
  const { error } = await supabase
    .from("bookings")
    .update({ status: "no_show", deposit_status: "forfeited" })
    .eq("id", bookingId);
  if (error) throw error;

  void supabase.functions
    .invoke("send-booking-notification", {
      body: { bookingId, event: "no_show" },
    })
    .catch(() => {});
}
