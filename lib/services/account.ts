/**
 * Account-deletion service. Calls the delete-account edge fn which runs the
 * full cascade with service-role privileges (storage wipe + auth.users.delete).
 */
import { supabase } from "@/lib/supabase";

export async function deleteMyAccount(): Promise<{
  photos_deleted: number;
  bookings_anonymised: number;
}> {
  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: {},
  });
  if (error) throw error;
  return data as {
    photos_deleted: number;
    bookings_anonymised: number;
  };
}
