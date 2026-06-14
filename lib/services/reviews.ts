/**
 * Reviews — verified-only (must reference a completed booking).
 */
import { supabase } from "@/lib/supabase";

export async function submitReview(input: {
  bookingId: string;
  clinicId: string;
  rating: number; // 1-5
  body?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

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
