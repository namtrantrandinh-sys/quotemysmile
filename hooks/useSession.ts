import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { breadcrumb, setUserContext } from "@/lib/observability";

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUserContext(data.session ? { id: data.session.user.id } : null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUserContext(s ? { id: s.user.id } : null);
      breadcrumb("auth", `auth:${event.toLowerCase()}`);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading, signedIn: !!session };
}
