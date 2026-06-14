-- ============================================================================
-- 0019 — Rate-limit table for public-register lookups
-- ============================================================================
-- ahpra-lookup + abn-lookup scrape free public registers. AHPRA and ABR will
-- ban us if we hit them at scale. We log every call by (caller_id, fn_name)
-- and the edge fns check the count in the last 60s before firing.
-- ============================================================================

create table if not exists public.lookup_audit (
  id          bigserial primary key,
  caller_id   uuid,                       -- auth.uid() of the caller
  fn_name     text not null,              -- 'ahpra-lookup' | 'abn-lookup'
  at          timestamptz not null default now()
);

create index if not exists lookup_audit_caller_at_idx
  on public.lookup_audit(caller_id, fn_name, at desc);

-- Service-role only.
alter table public.lookup_audit enable row level security;

-- Helper used by the edge fns. Returns true if the caller is within budget.
create or replace function public.check_lookup_quota(
  _caller uuid,
  _fn text,
  _max_per_min int default 5
) returns boolean
language plpgsql
security definer
as $$
declare
  recent_count int;
begin
  select count(*) into recent_count
    from public.lookup_audit
   where caller_id = _caller
     and fn_name = _fn
     and at > now() - interval '60 seconds';

  if recent_count >= _max_per_min then
    return false;
  end if;

  insert into public.lookup_audit (caller_id, fn_name)
  values (_caller, _fn);
  return true;
end$$;

revoke all on function public.check_lookup_quota(uuid, text, int) from public;
grant execute on function public.check_lookup_quota(uuid, text, int) to service_role;

-- Auto-purge: keep 7 days of audit; the rest is noise.
create or replace function public.purge_lookup_audit()
returns int language sql security definer as $$
  with d as (
    delete from public.lookup_audit
     where at < now() - interval '7 days'
     returning 1
  )
  select count(*)::int from d;
$$;
revoke all on function public.purge_lookup_audit() from public;
grant execute on function public.purge_lookup_audit() to service_role;
