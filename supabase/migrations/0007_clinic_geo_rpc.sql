-- ============================================================================
-- 0007 — RPC: clinic geo for a request's quotes (map view)
-- ============================================================================
-- Returns the clinic name + lat/lng for every quote on a request, scoped
-- by RLS (patient on own request, dentist on requests they've quoted on).
-- Used by the patient-side QuotesMap component.
-- ============================================================================

create or replace function public.clinic_geo_for_request(_request_id uuid)
returns table (
  quote_id uuid,
  total int,
  clinic_name text,
  lat double precision,
  lng double precision,
  status text
)
language sql
security definer
stable
set search_path = public
as $$
  select
    q.id,
    q.total,
    c.name,
    st_y(c.location::geometry)::double precision as lat,
    st_x(c.location::geometry)::double precision as lng,
    q.status::text
  from public.quotes q
  join public.clinics c on c.id = q.clinic_id
  where q.request_id = _request_id
    and (
      -- Patient on own request
      exists (
        select 1 from public.requests r
        where r.id = q.request_id and r.patient_id = auth.uid()
      )
      -- Dentist who also quoted on this request
      or exists (
        select 1 from public.quotes self
        where self.request_id = q.request_id and self.dentist_id = auth.uid()
      )
    );
$$;

revoke all on function public.clinic_geo_for_request(uuid) from public;
grant execute on function public.clinic_geo_for_request(uuid) to authenticated;
