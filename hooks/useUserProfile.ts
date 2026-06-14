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

  const load = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("users")
      .select("id, role, full_name, phone, email, ahpra_no, ahpra_verified_at, ahpra_reg_type")
      .eq("id", session.user.id)
      .maybeSingle();
    if (error) {
      console.warn("[QMS] profile load", error.message);
    }
    setProfile((data as UserProfile | null) ?? null);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  return { profile, loading, signedIn, reload: load };
}
