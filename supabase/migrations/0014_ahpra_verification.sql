-- ============================================================================
-- 0014 — AHPRA verification columns
-- ============================================================================
-- Tracks the state and audit trail of each dentist's AHPRA verification.
-- The ahpra-lookup edge fn writes these. The dentist app reads them to render
-- a VerificationBanner ("Pending", "Verified", "Conditional", "Suspended").
--
-- Quoting RLS already requires users.ahpra_no — this migration adds the
-- *status* layer needed to actually gate live quote submission until verified.
-- ============================================================================

create type ahpra_status as enum (
  'unknown',     -- never checked
  'pending',     -- check in flight
  'active',      -- registered + clean
  'conditional', -- registered with conditions (allowed but flagged)
  'suspended',   -- suspended or cancelled (blocked)
  'not_found'    -- number not on the register (blocked)
);

alter table public.users
  add column if not exists ahpra_status ahpra_status not null default 'unknown',
  add column if not exists ahpra_verified_at timestamptz,
  add column if not exists ahpra_last_checked_at timestamptz;

create index if not exists users_ahpra_status_idx on public.users(ahpra_status);

-- Gate quote submission: a dentist must be 'active' or 'conditional' to insert
-- a quote. Suspended / not_found / unknown / pending → blocked at the DB.
create or replace function public.assert_quoting_dentist_verified()
returns trigger language plpgsql as $$
declare
  s ahpra_status;
begin
  select ahpra_status into s
    from public.users
   where id = new.dentist_id;

  if s is null or s in ('unknown', 'pending', 'suspended', 'not_found') then
    raise exception 'AHPRA verification required before submitting quotes (status: %)', coalesce(s::text, 'null');
  end if;
  return new;
end$$;

drop trigger if exists quotes_require_ahpra on public.quotes;
create trigger quotes_require_ahpra
  before insert on public.quotes
  for each row execute function public.assert_quoting_dentist_verified();
