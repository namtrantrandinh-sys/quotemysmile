-- ============================================================================
-- 0002 — Fix infinite recursion in quotes_dentist_read RLS policy
-- ============================================================================
-- The original policy queried public.quotes from within a quotes policy,
-- which re-evaluates RLS recursively. Fix: use a SECURITY DEFINER function
-- that bypasses RLS for the membership check.
-- ============================================================================

drop policy if exists quotes_dentist_read on public.quotes;

create or replace function public.has_quote_on_request(_request_id uuid, _user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists(
    select 1
    from public.quotes q
    where q.request_id = _request_id
      and q.dentist_id = _user_id
  )
$$;

revoke all on function public.has_quote_on_request(uuid, uuid) from public;
grant execute on function public.has_quote_on_request(uuid, uuid) to authenticated;

create policy quotes_dentist_read on public.quotes for select using (
  dentist_id = auth.uid()
  or public.has_quote_on_request(request_id, auth.uid())
);
