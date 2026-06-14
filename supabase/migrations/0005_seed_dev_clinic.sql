-- ============================================================================
-- 0005 — DEV ONLY seed: a verified clinic so the live feed has something to look at
-- ============================================================================
-- Safe to run multiple times (on conflict do nothing).
-- Uses a fixed UUID for the demo user so we can attach quotes to it later.
-- ============================================================================

-- The auth.users row must exist before we can seed public.users — we skip the
-- profile insert when no matching auth user exists (RLS-friendly).
-- This file is mostly here as a placeholder for when you add the first real
-- dentist via the onboarding flow.

-- (No-op: seeding is done via the dentist onboarding screen against the
--  live database. Keeping the migration here for sequencing.)
select 1;
