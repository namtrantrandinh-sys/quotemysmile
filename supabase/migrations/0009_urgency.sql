-- ============================================================================
-- 0009 — Urgency (emergency / 1h / few / 24h / 3d) on requests
-- ============================================================================
-- Patient picks a window; emergency surfaces to dentists as URGENT.
-- closes_at is already set by app code based on urgency; we add an enum
-- column so dentists can filter their feed.
-- ============================================================================

create type urgency_level as enum ('emergency', '1h', 'few', '24h', '3d');

alter table public.requests
  add column if not exists urgency urgency_level not null default '24h';

create index if not exists requests_urgency_idx on public.requests(urgency);

-- Backfill existing rows from symptom_json.__urgency if it exists
update public.requests
   set urgency = (symptom_json->>'__urgency')::urgency_level
 where (symptom_json ? '__urgency')
   and (symptom_json->>'__urgency') in ('emergency','1h','few','24h','3d');
