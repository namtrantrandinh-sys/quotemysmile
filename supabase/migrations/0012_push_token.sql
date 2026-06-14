-- ============================================================================
-- 0012 — Expo push token on users
-- ============================================================================
alter table public.users
  add column if not exists push_token text;

create index if not exists users_push_token_idx on public.users(push_token)
  where push_token is not null;
