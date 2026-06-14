-- ============================================================================
-- 0020 — Booking messaging + health-fund details on requests
-- ============================================================================
-- 1. messages          — booking-scoped chat (patient ↔ clinic owner)
-- 2. requests.health_fund_json — what fund/level the patient is with, so the
--    quote screen can render a realistic out-of-pocket instead of a stub.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Messages
-- ----------------------------------------------------------------------------
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null references public.bookings(id) on delete cascade,
  sender_id   uuid not null references public.users(id),
  body        text not null check (char_length(body) between 1 and 2000),
  read_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index if not exists messages_booking_idx on public.messages(booking_id, created_at);

alter table public.messages enable row level security;

-- Patient on the booking can read+write
create policy messages_patient on public.messages for all using (
  exists (
    select 1 from public.bookings b
     where b.id = messages.booking_id
       and b.patient_id = auth.uid()
  )
) with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.bookings b
     where b.id = messages.booking_id
       and b.patient_id = auth.uid()
  )
);

-- Clinic owner on the booking can read+write
create policy messages_clinic_owner on public.messages for all using (
  exists (
    select 1 from public.bookings b
      join public.clinics c on c.id = b.clinic_id
     where b.id = messages.booking_id
       and c.owner_user_id = auth.uid()
  )
) with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.bookings b
      join public.clinics c on c.id = b.clinic_id
     where b.id = messages.booking_id
       and c.owner_user_id = auth.uid()
  )
);

alter publication supabase_realtime add table public.messages;

-- ----------------------------------------------------------------------------
-- Health-fund details on the request (optional, supplied during symptoms step)
-- ----------------------------------------------------------------------------
alter table public.requests
  add column if not exists health_fund_json jsonb not null default '{}'::jsonb;

comment on column public.requests.health_fund_json is
  'Patient health fund details (provider, level, member_id_last4). Used only to render an estimated out-of-pocket on the quote screen. Never shared with dentists at quote time.';
