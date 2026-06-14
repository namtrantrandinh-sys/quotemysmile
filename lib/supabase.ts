/**
 * Supabase client — QuoteMySmile.
 *
 * Project: quotemysmile (mqlaoxcjebzsihiocmzm) · Sydney (ap-southeast-2)
 * Org: QuoteMySmile (Free) — separate from Lordly
 *
 * Schema lives in supabase/migrations/0001_initial.sql
 * RLS is mandatory on every public table.
 */
import { createClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  // eslint-disable-next-line no-console
  console.warn(
    "[QMS] Supabase env not set — copy .env.example to .env.local and restart.",
  );
}

export const supabase = createClient(url ?? "", key ?? "", {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export const SUPABASE_CONFIGURED = Boolean(url && key);
