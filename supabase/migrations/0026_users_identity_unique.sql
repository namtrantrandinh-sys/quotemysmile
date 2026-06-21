-- ----------------------------------------------------------------------------
-- 0026_users_identity_unique.sql
--
-- Enforce one-account-per-identifier at the DATABASE layer so duplicate
-- profiles can NEVER be created, even if the app layer regresses.
--
-- WHY:
--   Pre-0026, public.users had no unique constraint on phone or email.
--   Combined with Supabase Auth treating phone-sign-in and email-sign-in
--   as two separate auth.users rows, a user signing up with their phone
--   and later signing in with their email got a brand-new empty profile.
--   The fix is two-layered:
--     1) App: bind both phone and email to ONE auth.users row at signup
--        (updateUser({email|phone}) + verifyOtp type='*_change').
--     2) DB: unique partial indexes here so even an app bug cannot
--        produce duplicate profiles.
--
-- Partial indexes (WHERE … IS NOT NULL) let optional NULL identifiers
-- coexist — older rows that have only phone or only email don't violate
-- the constraint, but two non-null rows cannot share an identifier.
--
-- Both identifiers are normalised to lowercase / E.164 client-side
-- (see app/sign-in.tsx normalisePhone + trim().toLowerCase()), so a
-- case-mismatch can't sneak past the index.
-- ----------------------------------------------------------------------------

create unique index if not exists users_phone_unique
  on public.users(phone)
  where phone is not null;

create unique index if not exists users_email_unique
  on public.users(lower(email))
  where email is not null;
