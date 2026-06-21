import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useSession } from "./useSession";

export type UserProfile = {
  id: string;
  role: "patient" | "dentist" | "admin";
  full_name: string;
  phone: string | null;
  email: string | null;
  ahpra_no: string | null;
  ahpra_verified_at: string | null;
  ahpra_reg_type: string | null;
};

export function useUserProfile() {
  const { session, signedIn } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  // Surface profile-load failures so screens can show an explicit error
  // instead of silently rendering an empty signed-out state. Most common
  // cause is an RLS rejection right after the auth row exists but the
  // public.users row hasn't been inserted yet — the caller can retry.
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setError(null);
      setLoading(false);
      return;
    }
    setError(null);
    const { data, error: err } = await supabase
      .from("users")
      .select("id, role, full_name, phone, email, ahpra_no, ahpra_verified_at, ahpra_reg_type")
      .eq("id", session.user.id)
      .maybeSingle();
    if (err) {
      console.warn("[QMS] profile load", err.message);
      setError(err.message);
    }
    setProfile((data as UserProfile | null) ?? null);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  return { profile, loading, signedIn, error, reload: load };
}
