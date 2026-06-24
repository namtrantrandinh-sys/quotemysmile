-- ----------------------------------------------------------------------------
-- 0027_split_patient_dentist_profiles.sql
--
-- Split the single `users.role` column into two independent profile
-- tables so the SAME phone/email can hold BOTH a patient persona AND a
-- dentist persona with NO crossover. Each portal reads/writes only its
-- own profile row; bookings, requests, quotes and inboxes are naturally
-- scoped because they reference `auth.users(id)` but the role gate
-- (who is allowed to insert what) is now keyed on profile-row existence.
--
-- WHY:
--   The old shape — one public.users row with a single role enum — meant
--   a dentist who wanted to book their own dental work elsewhere had no
--   way to do so without creating a second account on a different
--   number. The product needs same-identity dual-role.
--
-- SHAPE:
--   public.users — base identity (id, phone, email, is_admin, full_name).
--                  No role column. Created once per auth.uid().
--   public.patient_profiles — exists iff this identity has a patient persona.
--   public.dentist_profiles — exists iff this identity has a dentist persona,
--                  carries AHPRA fields.
--
-- BACKFILL: copies existing role='patient' rows into patient_profiles,
--   existing role='dentist' rows into dentist_profiles. Pre-launch, so
--   no real users — backfill is essentially a no-op but kept for safety.
--
-- RLS:
--   Each profile is self-read/self-write only (auth.uid() = user_id).
--   PLUS we tighten existing policies on `requests` and `quotes` so
--   creating a request requires a patient_profile row and creating a
--   quote requires a dentist_profile row. This makes crossover
--   impossible at the DB layer even if app code regresses.
-- ----------------------------------------------------------------------------

-- ----------------------------------------------------------------------------
-- 1) ADMIN FLAG — replaces the 'admin' branch of user_role
-- ----------------------------------------------------------------------------
alter table public.users add column if not exists is_admin boolean not null default false;
update public.users set is_admin = true where role = 'admin';

-- ----------------------------------------------------------------------------
-- 2) NEW PROFILE TABLES
-- ----------------------------------------------------------------------------

create table public.patient_profiles (
  user_id     uuid primary key references public.users(id) on delete cascade,
  full_name   text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.dentist_profiles (
  user_id               uuid primary key references public.users(id) on delete cascade,
  full_name             text not null,
  ahpra_no              text,
  ahpra_status          ahpra_status not null default 'unknown',
  ahpra_verified_at     timestamptz,
  ahpra_reg_type        text,
  ahpra_last_checked_at timestamptz,
  onboarding_acks       jsonb not null default '[]'::jsonb,
  stripe_customer_id    text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index dentist_profiles_ahpra_idx
  on public.dentist_profiles(ahpra_no)
  where ahpra_no is not null;
create index dentist_profiles_ahpra_status_idx
  on public.dentist_profiles(ahpra_status);
create unique index dentist_profiles_stripe_customer_idx
  on public.dentist_profiles(stripe_customer_id)
  where stripe_customer_id is not null;

-- updated_at triggers
create trigger patient_profiles_updated_at
  before update on public.patient_profiles
  for each row execute function set_updated_at();
create trigger dentist_profiles_updated_at
  before update on public.dentist_profiles
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- 3) BACKFILL
-- ----------------------------------------------------------------------------

insert into public.patient_profiles (user_id, full_name, created_at, updated_at)
  select id, full_name, created_at, updated_at
  from public.users
  where role = 'patient'
on conflict (user_id) do nothing;

insert into public.dentist_profiles (
  user_id, full_name, ahpra_no, ahpra_status, ahpra_verified_at,
  ahpra_reg_type, ahpra_last_checked_at, onboarding_acks,
  stripe_customer_id, created_at, updated_at
)
  select id, full_name, ahpra_no,
         coalesce(ahpra_status, 'unknown'::ahpra_status),
         ahpra_verified_at, ahpra_reg_type, ahpra_last_checked_at,
         coalesce(onboarding_acks, '[]'::jsonb),
         stripe_customer_id, created_at, updated_at
  from public.users
  where role = 'dentist'
on conflict (user_id) do nothing;

-- ----------------------------------------------------------------------------
-- 4) RLS ON NEW TABLES — self-read/self-write only
-- ----------------------------------------------------------------------------

alter table public.patient_profiles enable row level security;
alter table public.dentist_profiles enable row level security;

create policy patient_profiles_self_read on public.patient_profiles
  for select using (auth.uid() = user_id);
create policy patient_profiles_self_insert on public.patient_profiles
  for insert with check (auth.uid() = user_id);
create policy patient_profiles_self_update on public.patient_profiles
  for update using (auth.uid() = user_id);
create policy patient_profiles_self_delete on public.patient_profiles
  for delete using (auth.uid() = user_id);

create policy dentist_profiles_self_read on public.dentist_profiles
  for select using (auth.uid() = user_id);
create policy dentist_profiles_self_insert on public.dentist_profiles
  for insert with check (auth.uid() = user_id);
create policy dentist_profiles_self_update on public.dentist_profiles
  for update using (auth.uid() = user_id);
create policy dentist_profiles_self_delete on public.dentist_profiles
  for delete using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5) TIGHTEN EXISTING POLICIES — DB-level role gates
--    The old policies only checked auth.uid() = patient_id / dentist_id;
--    they did not enforce that the actor actually holds the matching
--    profile. With dual-role identities we MUST gate here, otherwise a
--    dentist-only account could insert a `requests` row through the
--    patient surface (or vice versa) and create the very crossover we
--    are eliminating.
-- ----------------------------------------------------------------------------

-- REQUESTS — patient-only insert/update/delete
drop policy if exists requests_patient_all on public.requests;
create policy requests_patient_select on public.requests for select
  using (auth.uid() = patient_id);
create policy requests_patient_insert on public.requests for insert
  with check (
    auth.uid() = patient_id
    and exists (
      select 1 from public.patient_profiles pp where pp.user_id = auth.uid()
    )
  );
create policy requests_patient_update on public.requests for update
  using (auth.uid() = patient_id);
create policy requests_patient_delete on public.requests for delete
  using (auth.uid() = patient_id);

-- QUOTES — dentist-only insert
drop policy if exists quotes_dentist_insert on public.quotes;
create policy quotes_dentist_insert on public.quotes for insert with check (
  dentist_id = auth.uid()
  and exists (
    select 1 from public.dentist_profiles dp where dp.user_id = auth.uid()
  )
);

-- BOOKINGS — patient-only insert (the patient picks the quote)
drop policy if exists bookings_patient on public.bookings;
create policy bookings_patient_select on public.bookings for select
  using (auth.uid() = patient_id);
create policy bookings_patient_insert on public.bookings for insert
  with check (
    auth.uid() = patient_id
    and exists (
      select 1 from public.patient_profiles pp where pp.user_id = auth.uid()
    )
  );
create policy bookings_patient_update on public.bookings for update
  using (auth.uid() = patient_id);

-- ----------------------------------------------------------------------------
-- 6) REWRITE AHPRA QUOTING TRIGGER — read status from dentist_profiles
--    (migration 0014 created this against users.ahpra_status; the column
--    is about to move).
-- ----------------------------------------------------------------------------

create or replace function public.assert_quoting_dentist_verified()
returns trigger language plpgsql as $$
declare
  s ahpra_status;
begin
  select ahpra_status into s
    from public.dentist_profiles
   where user_id = new.dentist_id;

  if s is null or s in ('unknown', 'pending', 'suspended', 'not_found') then
    raise exception 'AHPRA verification required before submitting quotes (status: %)', coalesce(s::text, 'null');
  end if;
  return new;
end$$;

-- ----------------------------------------------------------------------------
-- 7) DROP relocated columns + indexes on users; drop user_role enum
-- ----------------------------------------------------------------------------

drop index if exists public.users_role_idx;
drop index if exists public.users_ahpra_idx;
drop index if exists public.users_ahpra_status_idx;
drop index if exists public.users_stripe_customer_idx;

alter table public.users alter column full_name drop not null;
alter table public.users drop column role;
alter table public.users drop column if exists ahpra_no;
alter table public.users drop column if exists ahpra_status;
alter table public.users drop column if exists ahpra_verified_at;
alter table public.users drop column if exists ahpra_reg_type;
alter table public.users drop column if exists ahpra_last_checked_at;
alter table public.users drop column if exists onboarding_acks;
alter table public.users drop column if exists stripe_customer_id;

drop type if exists user_role;
