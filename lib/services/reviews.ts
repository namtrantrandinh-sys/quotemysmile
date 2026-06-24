/**
 * Reviews — verified-only (must reference a completed booking).
 *
 * AHPRA s.133 compliance: any patient-submitted body text is scanned
 * client-side for clinical-care references (cf. scanReview). The server
 * also re-validates via the check_review_clinical_terms trigger added
 * in migration 0029. Penalty for a non-compliant testimonial advertisement
 * runs $30k/individual + $60k/business per breach — both gates fail
 * closed.
 */
import { supabase } from "@/lib/supabase";
import { scanReview } from "@/lib/ahpraFilter";

export class ReviewClinicalRejectedError extends Error {
  matches: string[];
  constructor(matches: string[]) {
    super(
      `Your review mentions clinical treatment (${matches.join(", ")}). AHPRA rules require service-only reviews — please rewrite focusing on the visit itself (staff, wait time, transparency).`,
    );
    this.name = "ReviewClinicalRejectedError";
    this.matches = matches;
  }
}

export async function submitReview(input: {
  bookingId: string;
  clinicId: string;
  rating: number; // 1-5
  body?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // Client-side AHPRA gate — surfaces a clear error before we waste a
  // round-trip to RLS. The server trigger remains the source of truth.
  if (input.body) {
    const scan = scanReview(input.body);
    if (!scan.ok) {
      throw new ReviewClinicalRejectedError(scan.matches);
    }
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      booking_id: input.bookingId,
      clinic_id: input.clinicId,
      patient_id: user.id,
      rating: input.rating,
      body: input.body ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function getClinicRating(clinicId: string) {
  const { data, error } = await supabase.rpc("clinic_rating", {
    _clinic_id: clinicId,
  });
  if (error) return { avg_rating: 0, review_count: 0 };
  const row = Array.isArray(data) ? data[0] : data;
  return (row as { avg_rating: number; review_count: number }) ?? { avg_rating: 0, review_count: 0 };
}
