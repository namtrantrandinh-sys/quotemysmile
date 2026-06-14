-- ============================================================================
-- QuoteMySmile — initial schema
-- ============================================================================
-- Version: 0001
-- Date: 2026-06-13
-- Purpose: Live dental quote marketplace for Australia.
-- Notes:
--   - PostGIS for geofence queries
--   - All tables RLS-enabled (auto-RLS was set at project create)
--   - quotes.requote_count hard-capped at 1 (CHECK constraint)
--   - AHPRA #, dentist name, and ack timestamps denormalised on quotes
--     for immutable audit trail (regulator/complaint defence)
-- ============================================================================

create extension if not exists "postgis";
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------

create type user_role as enum ('patient', 'dentist', 'admin');

create type request_status as enum (
  'open',          -- broadcast, accepting quotes
  'closed',        -- window expired or filled
  'patient_review',-- closed but patient can still book within 7 days
  'booked',        -- patient picked a quote
  'expired',       -- 7-day patient review window passed without booking
  'cancelled'      -- patient cancelled
);

create type quote_status as enum (
  'live',    -- visible, can be requoted once
  'final',   -- locked after the one requote
  'won',     -- patient booked this quote
  'expired'  -- request closed, this quote not won
);

create type category as enum (
  'filling-clean','checkup-clean','emergency',
  'cosmetic','whitening','crown-veneer',
  'implant','wisdom','ortho','not-sure'
);

-- ----------------------------------------------------------------------------
-- USERS  (auth.users is the canonical source; this is the app profile)
-- ----------------------------------------------------------------------------

create table public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  role          user_role not null,
  full_name     text not null,
  phone         text,
  email         text,
  -- dentist-specific
  ahpra_no      text,
  ahpra_verified_at timestamptz,
  ahpra_reg_type text,                  -- 'General' / 'Specialist' / blocked
  -- ack audit log (jsonb of { key, accepted_at, ip, user_agent })
  onboarding_acks jsonb default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index users_role_idx on public.users(role);
create index users_ahpra_idx on public.users(ahpra_no) where ahpra_no is not null;

-- ----------------------------------------------------------------------------
-- CLINICS
-- ----------------------------------------------------------------------------

create table public.clinics (
  id            uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users(id) on delete cascade,
  name          text not null,
  abn           text not null,
  abn_verified_at timestamptz,
  address       text not null,
  location      geography(point, 4326) not null,
  service_radius_km int not null default 10 check (service_radius_km between 1 and 50),
  categories    category[] not null default array[]::category[],
  pii_provider  text,
  pii_policy    text,
  pii_expiry    date,
  verified      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index clinics_location_gix on public.clinics using gist(location);
create index clinics_owner_idx on public.clinics(owner_user_id);

-- ----------------------------------------------------------------------------
-- REQUESTS
-- ----------------------------------------------------------------------------

create table public.requests (
  id            uuid primary key default gen_random_uuid(),
  patient_id    uuid not null references public.users(id),
  category      category not null,
  photo_urls    text[] not null default array[]::text[],
  photo_quality_score numeric(2,1) check (photo_quality_score between 0 and 5),
  symptom_json  jsonb not null default '{}'::jsonb,
  location      geography(point, 4326) not null,
  radius_km     int not null default 10 check (radius_km between 1 and 30),
  status        request_status not null default 'open',
  opens_at      timestamptz not null default now(),
  closes_at     timestamptz not null,
  patient_ack_disclaimer_at timestamptz not null default now(),
  booked_quote_id uuid,
  created_at    timestamptz not null default now()
);

create index requests_location_gix on public.requests using gist(location);
create index requests_status_idx on public.requests(status, closes_at);
create index requests_patient_idx on public.requests(patient_id);

-- ----------------------------------------------------------------------------
-- QUOTES — the heart of the system, with full audit trail
-- ----------------------------------------------------------------------------

create table public.quotes (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests(id) on delete cascade,
  clinic_id     uuid not null references public.clinics(id),
  dentist_id    uuid not null references public.users(id),
  total         integer not null check (total > 0),         -- cents preferred? using AUD whole units for now
  previous_total integer,                                    -- set if requoted
  items_json    jsonb not null default '[]'::jsonb,          -- ADA item codes + amounts
  availability_slots jsonb not null default '[]'::jsonb,
  note          text,
  status        quote_status not null default 'live',
  requote_count int not null default 0 check (requote_count <= 1),  -- HARD CAP
  locked_at     timestamptz,                                  -- set after requote
  -- audit / AHPRA defence (denormalised so it survives if user updates)
  ahpra_no      text not null,
  ahpra_reg_type text not null,
  dentist_name_at_quote text not null,
  ack_responsibility_at timestamptz not null,
  ack_photo_based_at    timestamptz not null,
  ack_ip_address text,
  ack_user_agent text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (request_id, clinic_id)  -- one quote per clinic per request
);

create index quotes_request_idx on public.quotes(request_id);
create index quotes_clinic_idx on public.quotes(clinic_id);
create index quotes_status_idx on public.quotes(status);

-- ----------------------------------------------------------------------------
-- BOOKINGS
-- ----------------------------------------------------------------------------

create table public.bookings (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests(id),
  quote_id      uuid not null references public.quotes(id),
  patient_id    uuid not null references public.users(id),
  clinic_id     uuid not null references public.clinics(id),
  slot          timestamptz not null,
  status        text not null default 'confirmed',  -- confirmed | completed | cancelled | no_show
  patient_ack_indicative_at timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index bookings_patient_idx on public.bookings(patient_id);
create index bookings_clinic_idx on public.bookings(clinic_id);

-- ----------------------------------------------------------------------------
-- EVENTS — append-only audit log
-- ----------------------------------------------------------------------------

create table public.events (
  id            bigserial primary key,
  actor_id      uuid references public.users(id),
  request_id    uuid references public.requests(id),
  type          text not null,    -- e.g. 'quote.submitted', 'quote.requoted', 'booking.confirmed'
  payload       jsonb not null default '{}'::jsonb,
  ip_address    text,
  user_agent    text,
  ts            timestamptz not null default now()
);

create index events_request_idx on public.events(request_id);
create index events_actor_idx on public.events(actor_id);
create index events_type_idx on public.events(type);

-- ----------------------------------------------------------------------------
-- TRIGGERS
-- ----------------------------------------------------------------------------

-- Auto-update updated_at on row change
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end$$;

create trigger users_updated_at      before update on public.users      for each row execute function set_updated_at();
create trigger clinics_updated_at    before update on public.clinics    for each row execute function set_updated_at();
create trigger quotes_updated_at     before update on public.quotes     for each row execute function set_updated_at();
create trigger bookings_updated_at   before update on public.bookings   for each row execute function set_updated_at();

-- Lock quote after the one allowed requote
create or replace function lock_quote_after_requote() returns trigger language plpgsql as $$
begin
  if new.requote_count = 1 and old.requote_count = 0 then
    new.status = 'final';
    new.locked_at = now();
  end if;
  return new;
end$$;

create trigger quotes_lock_after_requote
  before update of requote_count on public.quotes
  for each row execute function lock_quote_after_requote();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------

alter table public.users      enable row level security;
alter table public.clinics    enable row level security;
alter table public.requests   enable row level security;
alter table public.quotes     enable row level security;
alter table public.bookings   enable row level security;
alter table public.events     enable row level security;

-- USERS: each user reads/writes own profile only
create policy users_self_read on public.users for select using (auth.uid() = id);
create policy users_self_write on public.users for update using (auth.uid() = id);

-- CLINICS: owner CRUD; everyone can read verified clinics
create policy clinics_owner_all on public.clinics for all using (auth.uid() = owner_user_id);
create policy clinics_public_read on public.clinics for select using (verified = true);

-- REQUESTS: patient owns own; dentists in radius can see open requests for their categories
create policy requests_patient_all on public.requests for all using (auth.uid() = patient_id);

create policy requests_dentist_in_range on public.requests for select using (
  status = 'open'
  and exists (
    select 1 from public.clinics c
    where c.owner_user_id = auth.uid()
      and st_dwithin(c.location, public.requests.location, public.requests.radius_km * 1000)
      and public.requests.category = any (c.categories)
  )
);

-- QUOTES: patient sees quotes on own requests; dentist sees own quotes + competitor quotes on the same request (open feed model)
create policy quotes_patient_read on public.quotes for select using (
  exists (
    select 1 from public.requests r
    where r.id = public.quotes.request_id and r.patient_id = auth.uid()
  )
);

create policy quotes_dentist_read on public.quotes for select using (
  -- own quote OR a quote on a request the dentist is also quoting on
  dentist_id = auth.uid()
  or exists (
    select 1 from public.quotes q2
    where q2.request_id = public.quotes.request_id and q2.dentist_id = auth.uid()
  )
);

create policy quotes_dentist_insert on public.quotes for insert with check (
  dentist_id = auth.uid()
);

create policy quotes_dentist_update on public.quotes for update using (
  dentist_id = auth.uid() and status = 'live'
);

-- BOOKINGS: patient + clinic owner
create policy bookings_patient on public.bookings for all using (auth.uid() = patient_id);
create policy bookings_clinic on public.bookings for select using (
  exists (
    select 1 from public.clinics c
    where c.id = public.bookings.clinic_id and c.owner_user_id = auth.uid()
  )
);

-- EVENTS: append-only, actor inserts own
create policy events_actor_insert on public.events for insert with check (auth.uid() = actor_id);
create policy events_actor_read on public.events for select using (auth.uid() = actor_id);

-- ----------------------------------------------------------------------------
-- REALTIME
-- ----------------------------------------------------------------------------

-- Quotes are the live-streaming surface — both sides subscribe to changes on a request.
alter publication supabase_realtime add table public.quotes;
alter publication supabase_realtime add table public.requests;
