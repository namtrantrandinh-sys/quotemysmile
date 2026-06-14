-- ============================================================================
-- 0010 — Booking deposit + advance scheduling
-- ============================================================================
-- Patients secure a future consult by paying a $50–$100 refundable deposit
-- to QuoteMySmile via Stripe. Deposit is:
--   - Credited to the dentist's invoice if the patient attends (no double-pay)
--   - Refunded if the patient cancels >=24h before
--   - Forfeited (no-show fee) if the patient misses the appointment
--
-- Legal framing (CRITICAL — AHPRA fee-splitting shield):
--   - The deposit is a PLATFORM SECURITY DEPOSIT held by QMS, NOT a clinical
--     fee. It's the same legal structure as Airbnb's security deposit.
--   - Final consult + treatment fees are paid by the patient to the dentist
--     directly, exactly as in a normal dental visit.
--   - QMS does not split clinical fees with dentists.
-- ============================================================================

create type deposit_status as enum (
  'pending',          -- payment intent created, not yet paid
  'paid',             -- patient paid, booking secured
  'credited',         -- patient attended; deposit credited to dentist invoice
  'refunded',         -- patient cancelled >=24h before
  'forfeited',        -- patient no-show; deposit kept by QMS as no-show fee
  'failed'            -- payment failed
);

alter table public.bookings
  add column if not exists deposit_amount int not null default 0,           -- cents (AUD)
  add column if not exists deposit_status deposit_status not null default 'pending',
  add column if not exists deposit_stripe_pi text,                          -- Stripe PaymentIntent id
  add column if not exists deposit_paid_at timestamptz,
  add column if not exists deposit_refunded_at timestamptz,
  add column if not exists cancellation_window_hours int not null default 24,
  add column if not exists booking_notes text;

create index if not exists bookings_deposit_status_idx on public.bookings(deposit_status);

-- Allow patients to read full booking row (already in place) — add an event when
-- deposit succeeds for audit trail.
create or replace function public.log_deposit_event() returns trigger
language plpgsql as $$
begin
  if new.deposit_status is distinct from old.deposit_status then
    insert into public.events (actor_id, request_id, type, payload)
    values (
      new.patient_id,
      new.request_id,
      'booking.deposit_' || new.deposit_status::text,
      jsonb_build_object(
        'booking_id', new.id,
        'amount_cents', new.deposit_amount,
        'stripe_pi', new.deposit_stripe_pi
      )
    );
  end if;
  return new;
end$$;

drop trigger if exists bookings_deposit_event on public.bookings;
create trigger bookings_deposit_event
  after update of deposit_status on public.bookings
  for each row execute function public.log_deposit_event();

-- Helper: which deposit tier applies based on quote total
create or replace function public.deposit_tier_for_quote(_quote_total int)
returns int
language sql
immutable
as $$
  select case
    when _quote_total >= 50000  then 10000  -- $500+ quote → $100 deposit
    when _quote_total >= 20000  then 7500   -- $200+ quote → $75 deposit
    else                              5000  -- otherwise   → $50 deposit
  end;
$$;
