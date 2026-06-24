import { supabase } from "@/lib/supabase";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";

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

// Sign-IN: shouldCreateUser:true so Supabase reliably sends the 6-digit
// OTP code (with false, the project's email template falls back to a
// magic-link confirm button and the user can never type a code).
// The duplicate-account risk this used to guard against is mitigated by
// the public.users unique constraints on phone/email.
export async function signInWithPhone(phone: string) {
  const { error } = await supabase.auth.signInWithOtp({
    phone,
    options: { shouldCreateUser: true },
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
  // shouldCreateUser:true is REQUIRED — with false, Supabase email
  // template falls back to magic-link confirm button, breaking the
  // "type the 6-digit code" UX entirely. Duplicate-account guard sits
  // at the public.users unique-constraint layer.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
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

/**
 * Apple Guideline 4.8 — Sign In with Apple.
 *
 * We collect the Apple identity-token client-side, hand it to Supabase
 * via signInWithIdToken. Supabase verifies the JWT against Apple's JWKS
 * (we supplied the App ID / Service ID + the private key in the Supabase
 * Auth provider config) and returns a session.
 *
 * iOS only — `usesAppleSignIn:true` flips the entitlement. The button is
 * hidden on Android.
 *
 * REQUIRED ASC + Supabase setup (one-time, off-platform):
 *   1. Apple Developer → Identifiers → enable Sign In with Apple on
 *      com.quotemysmile.app + on a Services ID (e.g. com.quotemysmile.auth).
 *   2. Generate a Sign-In-with-Apple key (.p8). Note the Key ID + Team ID.
 *   3. Supabase → Auth → Providers → Apple: paste Client ID (Services ID
 *      or bundle ID), Team ID, Key ID, private key. Toggle Enabled.
 *   4. Set callback URL on the Services ID to the Supabase auth callback.
 */
export async function signInWithApple() {
  if (Platform.OS !== "ios") {
    throw new Error("Sign in with Apple is only available on iOS.");
  }
  const available = await AppleAuthentication.isAvailableAsync();
  if (!available) {
    throw new Error("Sign in with Apple is not available on this device.");
  }
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });
  if (!credential.identityToken) {
    throw new Error("Apple did not return an identity token.");
  }
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "apple",
    token: credential.identityToken,
  });
  if (error) throw error;
  // Apple gives full_name + email ONLY on the first sign-in. Persist them
  // on public.users immediately so we don't lose them when the user
  // returns. fullName may be null if the user hid their email.
  const fullName =
    credential.fullName?.givenName || credential.fullName?.familyName
      ? [credential.fullName?.givenName, credential.fullName?.familyName]
          .filter(Boolean)
          .join(" ")
          .trim()
      : undefined;
  if (data.user) {
    try {
      await ensureUserShell({
        fullName,
        email: credential.email ?? data.user.email ?? undefined,
      });
    } catch {
      // non-fatal — the user is signed in; profile screens will re-collect
    }
  }
  return data;
}

export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Ensure a `public.users` shell row exists for the signed-in auth user.
 * Carries identity-level fields only (phone, email, full_name, is_admin).
 * Role lives on the profile rows (patient_profiles / dentist_profiles).
 *
 * Idempotent — safe to call before creating any profile. Used by both
 * createPatientProfile and createDentistProfile so the shell is always
 * present before the profile row references it.
 */
export async function ensureUserShell(input: {
  fullName?: string;
  phone?: string;
  email?: string;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("users")
    .upsert(
      {
        id: user.id,
        full_name: input.fullName ?? null,
        phone: input.phone ?? user.phone ?? null,
        email: input.email ?? user.email ?? null,
      },
      { onConflict: "id" },
    );

  if (error) throw error;
  return user.id;
}

/**
 * Create (or upsert) a PATIENT profile for the signed-in auth user.
 * Independent of any dentist profile on the same identity — a user with
 * a dentist profile can still book their own dental work as a patient.
 */
export async function createPatientProfile(input: {
  fullName: string;
  phone?: string;
  email?: string;
}) {
  const userId = await ensureUserShell({
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
  });

  const { data, error } = await supabase
    .from("patient_profiles")
    .upsert(
      { user_id: userId, full_name: input.fullName },
      { onConflict: "user_id" },
    )
    .select("user_id, full_name")
    .single();

  if (error) throw error;
  return data;
}

/**
 * Create (or upsert) a DENTIST profile for the signed-in auth user.
 * Carries AHPRA fields. Independent of any patient profile — a user can
 * hold both personas with the SAME phone/email.
 */
export async function createDentistProfile(input: {
  fullName: string;
  ahpraNo?: string;
  phone?: string;
  email?: string;
}) {
  const userId = await ensureUserShell({
    fullName: input.fullName,
    phone: input.phone,
    email: input.email,
  });

  const { data, error } = await supabase
    .from("dentist_profiles")
    .upsert(
      {
        user_id: userId,
        full_name: input.fullName,
        ahpra_no: input.ahpraNo ?? null,
      },
      { onConflict: "user_id" },
    )
    .select("user_id, full_name, ahpra_no")
    .single();

  if (error) throw error;
  return data;
}
