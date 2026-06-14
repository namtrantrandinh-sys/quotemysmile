-- ============================================================================
-- 0004 — Helper: count of live quotes on a request
-- ============================================================================
-- A safe RPC for the dentist UI to show "N quoting" without exposing all rows.
-- ============================================================================

create or replace function public.count_quotes_for_request(_request_id uuid)
returns int
language sql
security definer
stable
set search_path = public
as $$
  select count(*)::int
  from public.quotes
  where request_id = _request_id
    and status in ('live', 'final', 'won');
$$;

revoke all on function public.count_quotes_for_request(uuid) from public;
grant execute on function public.count_quotes_for_request(uuid) to authenticated;

-- Helper: list of competitor (clinic + total) for a request, when the caller
-- already has a quote on it. Returns nothing otherwise.
create or replace function public.competitor_summary(_request_id uuid)
returns table (clinic_name text, total int, status text)
language sql
security definer
stable
set search_path = public
as $$
  select c.name, q.total, q.status::text
  from public.quotes q
  join public.clinics c on c.id = q.clinic_id
  where q.request_id = _request_id
    and exists (
      select 1 from public.quotes self
      where self.request_id = _request_id
        and self.dentist_id = auth.uid()
    )
  order by q.total asc;
$$;

revoke all on function public.competitor_summary(uuid) from public;
grant execute on function public.competitor_summary(uuid) to authenticated;
