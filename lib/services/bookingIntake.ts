import { supabase } from "@/lib/supabase";
import { breadcrumb, captureError } from "@/lib/observability";

/**
 * Post-booking patient intake — short medical / safety questionnaire
 * the patient fills AFTER confirming their booking. Keeps the booking
 * funnel itself short (research shows >3 mins of forms → >40% drop)
 * while still giving the dentist what they need before the chair.
 *
 * Stored as a single JSONB blob on bookings.patient_intake_json so we
 * don't need a per-field schema migration if we tweak the form later.
 * Field names are stable so the dentist UI can render them in their
 * own quote-builder pane.
 */
export type PatientIntake = {
  // Free-text. Patient can enter 'none'. No PII validation — the
  // patient owns what they share, and RLS scopes the row to them +
  // the booked dentist.
  medical_conditions: string;
  allergies: string;
  current_medications: string;
  // Chair anxieties → dentist can prepare accordingly (sedation
  // option, longer slot, hand-holding plan).
  anxieties: string;
  // ISO date string YYYY-MM-DD or "never" / "unsure".
  last_cleaning_date: string;
  // Honest yes/no on smoking — affects oral surgery healing.
  smoker: boolean;
  // Pregnancy flag — affects x-rays & anaesthetic choice.
  pregnant: boolean;
};

export async function saveBookingIntake(
  bookingId: string,
  intake: PatientIntake,
): Promise<void> {
  const { error } = await supabase
    .from("bookings")
    .update({
      patient_intake_json: intake,
      patient_intake_at: new Date().toISOString(),
    })
    .eq("id", bookingId);
  if (error) {
    captureError(error, { ctx: "saveBookingIntake", bookingId });
    throw error;
  }
  breadcrumb("booking", "intake.saved", { bookingId });
}

export async function getBookingIntake(
  bookingId: string,
): Promise<{ intake: PatientIntake | null; at: string | null }> {
  const { data, error } = await supabase
    .from("bookings")
    .select("patient_intake_json, patient_intake_at")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw error;
  return {
    intake: (data?.patient_intake_json as PatientIntake | null) ?? null,
    at: (data?.patient_intake_at as string | null) ?? null,
  };
}
