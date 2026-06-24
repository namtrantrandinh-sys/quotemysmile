-- 0028_quote_reports.sql
-- Apple App Store 1.2 (User-Generated Content). Quotes are dentist-authored
-- text shown to patients; we must let patients report objectionable content
-- and review reports within 24h. This migration adds the table + RLS so the
-- mobile app can call insert from the client safely.

create table if not exists public.quote_reports (
  id          uuid primary key default gen_random_uuid(),
  quote_id    uuid not null references public.quotes(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason      text not null check (length(reason) between 1 and 80),
  detail      text check (length(detail) <= 2000),
  status      text not null default 'open' check (status in ('open', 'reviewed', 'dismissed')),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (quote_id, reporter_id)
);

create index if not exists quote_reports_status_idx
  on public.quote_reports (status, created_at desc);

alter table public.quote_reports enable row level security;

-- Patient may insert a report for any quote they can read.
create policy "patients insert own reports"
  on public.quote_reports
  for insert
  to authenticated
  with check (auth.uid() = reporter_id);

-- Patient may read their own reports (so we can show "Already reported").
create policy "patients read own reports"
  on public.quote_reports
  for select
  to authenticated
  using (auth.uid() = reporter_id);

-- No update / delete from clients — moderation runs with service role.

comment on table public.quote_reports is
  'Apple 1.2 UGC moderation: patient-submitted reports against dentist quotes. Reviewed off-platform within 24h.';
