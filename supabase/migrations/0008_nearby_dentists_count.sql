-- ============================================================================
-- 0008 — RPC: count verified clinics within radius of a point
-- ============================================================================
-- Used by the patient location screen to show "47 dentists within 10 km"
-- in real time as they slide the radius.
-- ============================================================================

create or replace function public.nearby_dentists_count(
  _lat double precision,
  _lng double precision,
  _radius_km int,
  _category category default null
)
returns int
language sql
security definer
stable
set search_path = public, extensions
as $$
  select count(*)::int
  from public.clinics c
  where c.verified = true
    and st_dwithin(
      c.location,
      ('SRID=4326;POINT(' || _lng || ' ' || _lat || ')')::geography,
      _radius_km * 1000
    )
    and (_category is null or _category = any (c.categories));
$$;

revoke all on function public.nearby_dentists_count(double precision, double precision, int, category) from public;
grant execute on function public.nearby_dentists_count(double precision, double precision, int, category) to anon, authenticated;
