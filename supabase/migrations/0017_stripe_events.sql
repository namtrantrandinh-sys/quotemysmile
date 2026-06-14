-- ============================================================================
-- 0017 — Stripe webhook event ledger (idempotency)
-- ============================================================================
-- Stripe will redeliver the same webhook event when our handler returns a
-- non-2xx, or sometimes randomly. We store the event id and skip if already
-- seen. Stripe event ids are deterministic per event (evt_...).
-- ============================================================================

create table if not exists public.stripe_events (
  id            text primary key,                 -- evt_...
  type          text not null,
  pi_id         text,                              -- payment_intent id (denormalised)
  received_at   timestamptz not null default now(),
  outcome       text not null default 'processed' -- 'processed' | 'skipped' | 'error'
);

create index if not exists stripe_events_pi_idx on public.stripe_events(pi_id);

-- Trim ledger after 90 days — Stripe's retry window is well under this.
create or replace function public.purge_old_stripe_events()
returns int language sql
security definer
as $$
  with deleted as (
    delete from public.stripe_events
     where received_at < now() - interval '90 days'
     returning 1
  )
  select count(*)::int from deleted;
$$;
revoke all on function public.purge_old_stripe_events() from public;
grant execute on function public.purge_old_stripe_events() to service_role;

-- This table is never read by patients/dentists.
alter table public.stripe_events enable row level security;
-- (no policies → only service_role can read/write)
