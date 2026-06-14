-- ============================================================================
-- 0016 — Platform service fee on attended bookings
-- ============================================================================
-- Revenue model v1:
--   On 'attended' the deposit is refunded MINUS a small platform service fee
--   that we keep. The fee is disclosed to the patient before they pay.
--   On 'cancel' (within eligible window) the deposit is refunded in FULL.
--   On 'no_show' / 'cancel (within forfeit window)' the deposit is forfeited
--   in full (existing behaviour).
--
-- The fee is stored per-booking so we can A/B test or grandfather older
-- bookings if we change the price later.
-- ============================================================================

alter table public.bookings
  add column if not exists platform_fee_cents int not null default 500;
-- Default A$5.00 platform service fee

-- Index isn't needed (we just read this row when computing the refund), but
-- a comment helps the next person.
comment on column public.bookings.platform_fee_cents is
  'Platform service fee retained from the deposit on attended visits. A$5.00 default. Refunded in full on patient cancel >= window.';
