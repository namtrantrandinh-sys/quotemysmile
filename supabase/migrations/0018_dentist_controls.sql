-- ============================================================================
-- 0018 — Dentist self-controls + emergency premium + clinic phone
-- ============================================================================
-- Adds:
--   clinics.accepting           — dentist can self-pause without admin help
--   clinics.phone               — for the patient "Message clinic" SMS link
--   quotes.emergency_premium_pct— transparently records any urgency uplift
--
-- Also gates the open-feed RLS on clinics.accepting so a paused dentist
-- silently drops out of the geofence broadcast.
-- ============================================================================

alter table public.clinics
  add column if not exists accepting boolean not null default true,
  add column if not exists phone text;

alter table public.quotes
  add column if not exists emergency_premium_pct int not null default 0
    check (emergency_premium_pct between 0 and 100);

-- Rewrite the existing requests RLS policy so paused dentists don't see
-- live requests. We drop + recreate (Postgres can't ALTER POLICY's USING).
drop policy if exists requests_dentist_in_range on public.requests;
create policy requests_dentist_in_range on public.requests for select using (
  exists (
    select 1
      from public.clinics c
     where c.owner_user_id = auth.uid()
       and c.accepting
       and st_dwithin(c.location, public.requests.location, public.requests.radius_km * 1000)
       and public.requests.category = any (c.categories)
  )
);

comment on column public.clinics.accepting is
  'Dentist self-pause. When false the clinic does not appear in the open-feed broadcast even if verified.';
comment on column public.quotes.emergency_premium_pct is
  'Urgency uplift percentage transparently shown to the patient. 0 for non-emergency.';
