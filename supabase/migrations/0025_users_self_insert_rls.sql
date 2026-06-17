-- Fix: first-time profile creation failed with a silent RLS error.
--
-- 0001_initial.sql enabled RLS on public.users and added SELECT + UPDATE
-- self-policies, but no INSERT policy. The client's createUserProfile()
-- uses .upsert(...) which performs an INSERT for the new row, and that
-- INSERT was being rejected by RLS the moment a freshly-verified user
-- tried to save their name on the "What's your name?" screen. The error
-- surfaced as "Profile error / Try again." because PostgrestError isn't
-- an Error subclass in supabase-js v2 — so the client's
-- `e instanceof Error ? e.message : "Try again."` swallowed the real
-- message.
--
-- Allow each authenticated user to insert exactly their own profile row
-- (id must equal auth.uid()). Matches the existing self_read / self_write
-- policy shape.

create policy users_self_insert on public.users
  for insert
  with check (auth.uid() = id);
