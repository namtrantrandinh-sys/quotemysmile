import { supabase } from "@/lib/supabase";

/**
 * Auth design — identity binding.
 *
 * QMS binds BOTH phone and email to ONE auth.users row at signup. This
 * is the only way to prevent "I signed up with phone but signed in with
 * email and got a brand-new empty profile" duplicate-account bugs.
 *
 * The sign-IN paths therefore pass shouldCreateUser:false — if the
 * identifier isn't on any auth.users row, Supabase returns a 400 and
 * we tell the user "no account on this number/email" instead of
 * silently spinning up a duplicate.
 *
 * The sign-UP paths pass shouldCreateUser:true — Supabase creates the
 * auth.users row, the user verifies the first OTP, then the profile
 * step calls startLink{Email,Phone}() + confirmLink{Email,Phone}() to
 * bind the second identifier to the same auth user before public.users
 * gets written.
 */

// Sign-IN: never create a new auth user on this path.
export async function signInWithPhone(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: false },
  });
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
  // Force 6-digit code (not magic link). Supabase Auth dashboard must
  // have the "Email OTP" template containing {{ .Token }} — if the
  // default ConfirmationURL template is still set, users get a link
  // that 404s in-app.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
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

// Sign-UP: explicitly create the auth user on first OTP. The caller
// is responsible for linking the second identifier afterwards.
export async function signUpWithPhone(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function signUpWithEmail(email: string) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

// Identity-link: attach the OTHER identifier to the signed-in auth user.
// updateUser({email|phone}) triggers an OTP to the new identifier.
// confirmLink* verifies that OTP with type 'email_change' / 'phone_change'
// so both identifiers end up bound to the same auth.users row.
export async function startLinkEmail(email: string) {
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}

export async function confirmLinkEmail(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email_change",
  });
  if (error) throw error;
}

export async function startLinkPhone(phone: string) {
  const { error } = await supabase.auth.updateUser({ phone });
  if (error) throw error;
}

export async function confirmLinkPhone(phone: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({
    phone,
    token,
    type: "phone_change",
  });
  if (error) throw error;
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
