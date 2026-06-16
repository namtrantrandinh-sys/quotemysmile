import { supabase } from "@/lib/supabase";

export async function signInWithPhone(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "sms",
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email: string) {
  // Force 6-digit code (not magic link).
  //   • Omit emailRedirectTo so Supabase doesn't generate a magic URL.
  //   • Supabase Auth needs the "Magic Link" / "Email OTP" template in the
  //     Supabase dashboard to contain {{ .Token }} (not {{ .ConfirmationURL }}).
  //     If your project still has the default ConfirmationURL template,
  //     users will receive a confirmation LINK that 404s in-app.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      // No emailRedirectTo → Supabase sends the code template.
    },
  });
  if (error) throw error;
}

export async function verifyEmailOtp(email: string, token: string) {
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Create the public.users profile row after first signup.
 * Called once after a fresh auth user is created.
 */
export async function createUserProfile(input: {
  role: "patient" | "dentist";
  fullName: string;
  phone?: string;
  email?: string;
  ahpraNo?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("users")
    .upsert({
      id: user.id,
      role: input.role,
      full_name: input.fullName,
      phone: input.phone ?? user.phone ?? null,
      email: input.email ?? user.email ?? null,
      ahpra_no: input.ahpraNo ?? null,
    })
    .select("id, role")
    .single();

  if (error) throw error;
  return data;
}
