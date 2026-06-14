-- ============================================================================
-- 0021 — Stripe customer id on users (for dentist monthly invoicing)
-- ============================================================================
-- The monthly sweep-dentist-fees fn looks up users.stripe_customer_id to
-- bill the A$5 platform fees via Stripe Invoices. We provision a Stripe
-- Customer the first time a dentist saves a card on file inside the app.
-- ============================================================================

alter table public.users
  add column if not exists stripe_customer_id text;

create unique index if not exists users_stripe_customer_idx
  on public.users(stripe_customer_id)
  where stripe_customer_id is not null;

comment on column public.users.stripe_customer_id is
  'Stripe Customer id for billing the A$5 platform fee on attended bookings. Provisioned on first card-save in the dentist app.';
