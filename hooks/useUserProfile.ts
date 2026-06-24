import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "./useSession";

/**
 * Same auth.users identity can hold BOTH a patient persona AND a
 * dentist persona — independent profile rows, no crossover. This hook
 * loads both and surfaces whichever exist.
 *
 * `isPatient` / `isDentist` are derived booleans for branching UI.
 * `isAdmin` reads the legacy `users.is_admin` flag (admin is not a
 * sign-in role; it's a privilege flag).
 */
export type PatientProfile = {
  user_id: string;
  full_name: string;
};

export type DentistAhpraStatus =
  | "unknown"
  | "pending"
  | "active"
  | "conditional"
  | "suspended"
  | "not_found";

export type DentistProfile = {
  user_id: string;
  full_name: string;
  ahpra_no: string | null;
  ahpra_status: DentistAhpraStatus;
  ahpra_verified_at: string | null;
  ahpra_reg_type: string | null;
};

export type UserShell = {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  is_admin: boolean;
};

export function useUserProfile() {
  const { session, loading: sessionLoading, signedIn } = useSession();
  const [user, setUser] = useState<UserShell | null>(null);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [dentist, setDentist] = useState<DentistProfile | null>(null);
  // Combined loading must include session bootstrap; otherwise consumers
  // that gate "if signed in render, else redirect" briefly read
  // signedIn=false during the first ~50ms after mount and redirect away
  // (caused the post-OTP sign-in loop pre-0027).
  const [profileLoading, setProfileLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setUser(null);
      setPatient(null);
      setDentist(null);
      setError(null);
      setProfileLoading(false);
      return;
    }
    setError(null);
    const uid = session.user.id;

    // Three parallel queries — none depend on each other, so fetch them
    // together to keep the post-sign-in flash short.
    const [shellRes, patientRes, dentistRes] = await Promise.all([
      supabase
        .from("users")
        .select("id, full_name, phone, email, is_admin")
        .eq("id", uid)
        .maybeSingle(),
      supabase
        .from("patient_profiles")
        .select("user_id, full_name")
        .eq("user_id", uid)
        .maybeSingle(),
      supabase
        .from("dentist_profiles")
        .select(
          "user_id, full_name, ahpra_no, ahpra_status, ahpra_verified_at, ahpra_reg_type",
        )
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    const firstErr =
      shellRes.error ?? patientRes.error ?? dentistRes.error ?? null;
    if (firstErr) {
      console.warn("[QMS] profile load", firstErr.message);
      setError(firstErr.message);
    }
    setUser((shellRes.data as UserShell | null) ?? null);
    setPatient((patientRes.data as PatientProfile | null) ?? null);
    setDentist((dentistRes.data as DentistProfile | null) ?? null);
    setProfileLoading(false);
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const isPatient = patient !== null;
  const isDentist = dentist !== null;
  const isAdmin = user?.is_admin === true;

  return {
    user,
    patient,
    dentist,
    isPatient,
    isDentist,
    isAdmin,
    loading: sessionLoading || profileLoading,
    signedIn,
    error,
    reload: load,
  };
}
