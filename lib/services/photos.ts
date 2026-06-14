import { supabase } from "@/lib/supabase";

/**
 * Upload a captured photo to the request-photos bucket.
 * Path: <patient_id>/<request_id>/<slot>.jpg
 */
export async function uploadRequestPhoto(input: {
  requestId: string;
  slotName: string;
  fileUri: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const path = `${user.id}/${input.requestId}/${input.slotName}.jpg`;

  // React Native fetch -> blob is the supported path
  const res = await fetch(input.fileUri);
  const blob = await res.blob();

  const { error } = await supabase.storage
    .from("request-photos")
    .upload(path, blob, {
      contentType: "image/jpeg",
      upsert: true,
    });
  if (error) throw error;

  return { path };
}

export async function signedPhotoUrl(path: string, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from("request-photos")
    .createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}
