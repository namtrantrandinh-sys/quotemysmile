-- ============================================================================
-- 0011 — Reviews + show-up tracking
-- ============================================================================
-- Verified-only reviews (must reference a `bookings.status = 'completed'`).
-- Dentists can flag attended / no_show on their bookings to release the
-- deposit (attended → credited; no_show → forfeited).
-- ============================================================================

create table public.reviews (
  id              uuid primary key default gen_random_uuid(),
  booking_id      uuid not null references public.bookings(id) on delete cascade,
  patient_id      uuid not null references public.users(id),
  clinic_id       uuid not null references public.clinics(id),
  rating          smallint not null check (rating between 1 and 5),
  body            text,
  created_at      timestamptz not null default now(),
  unique (booking_id)
);

create index reviews_clinic_idx on public.reviews(clinic_id);
create index reviews_patient_idx on public.reviews(patient_id);

alter table public.reviews enable row level security;

-- Patient can write a review only for their own COMPLETED booking
create policy reviews_patient_insert on public.reviews for insert
to authenticated
with check (
  patient_id = auth.uid()
  and exists (
    select 1 from public.bookings b
    where b.id = booking_id
      and b.patient_id = auth.uid()
      and b.status = 'completed'
  )
);

create policy reviews_patient_self on public.reviews for select
to authenticated
using (patient_id = auth.uid());

-- Anyone can read reviews for a verified clinic (public listing)
create policy reviews_public on public.reviews for select
to anon, authenticated
using (
  exists (select 1 from public.clinics c where c.id = clinic_id and c.verified = true)
);

-- ============================================================================
-- Allow dentists to mark their bookings as attended / no_show
-- ============================================================================
-- The deposit pipeline:
--   attended  → status=completed, deposit_status=credited (refund to dentist via Stripe Connect)
--   no_show   → status=no_show,    deposit_status=forfeited (kept by QMS)
--   cancelled → status=cancelled, deposit_status=refunded (refund patient via webhook)
-- ============================================================================

create policy bookings_clinic_update on public.bookings for update
to authenticated
using (
  exists (
    select 1 from public.clinics c
    where c.id = public.bookings.clinic_id and c.owner_user_id = auth.uid()
  )
)
with check (
  status in ('confirmed', 'completed', 'no_show', 'cancelled')
);

-- ============================================================================
-- Clinic rating summary RPC (used in quote card + listing)
-- ============================================================================
create or replace function public.clinic_rating(_clinic_id uuid)
returns table (avg_rating numeric, review_count int)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(avg(rating), 0)::numeric(3, 2),
    count(*)::int
  from public.reviews
  where clinic_id = _clinic_id;
$$;

revoke all on function public.clinic_rating(uuid) from public;
grant execute on function public.clinic_rating(uuid) to anon, authenticated;
