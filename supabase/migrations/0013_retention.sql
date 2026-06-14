-- ============================================================================
-- 0013 — 30-day retention helpers
-- ============================================================================
-- The privacy policy promises location + photos are deleted 30 days after a
-- request closes. We add:
--   - requests.closed_at — set by trigger when status leaves 'open'
--   - public.purge_stale_request_data() — SECURITY DEFINER fn the purge-stale-data
--     edge fn calls on a daily cron.
--   - public.events('data.purged_...') audit rows for every purge
-- ============================================================================

alter table public.requests
  add column if not exists closed_at timestamptz;

create or replace function public.set_request_closed_at()
returns trigger language plpgsql as $$
begin
  if new.status <> 'open' and (old.status = 'open' or old.status is null) then
    new.closed_at := coalesce(new.closed_at, now());
  end if;
  return new;
end$$;

drop trigger if exists requests_set_closed_at on public.requests;
create trigger requests_set_closed_at
  before update of status on public.requests
  for each row execute function public.set_request_closed_at();

-- Backfill closed_at for any pre-existing non-open requests
update public.requests
   set closed_at = coalesce(closed_at, created_at)
 where status <> 'open' and closed_at is null;

-- ----------------------------------------------------------------------------
-- Purge function — invoked from edge fn on a daily cron
-- ----------------------------------------------------------------------------
-- Returns the list of (request_id, photo_path[]) tuples that the caller needs
-- to delete from storage (storage.objects.delete via service role). The fn
-- itself wipes the DB-side columns and records audit rows. Storage deletion
-- happens caller-side because PL/pgSQL can't reach the storage HTTP API.

create or replace function public.purge_stale_request_data(_older_than_days int default 30)
returns table (request_id uuid, photo_urls text[])
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  r record;
begin
  for r in
    select id, photo_urls
      from public.requests
     where status <> 'open'
       and closed_at is not null
       and closed_at < now() - make_interval(days => _older_than_days)
       and (photo_urls is not null and array_length(photo_urls, 1) > 0)
  loop
    insert into public.events (actor_id, request_id, type, payload)
    values (
      null,
      r.id,
      'data.purged_photos_location',
      jsonb_build_object(
        'photo_count', coalesce(array_length(r.photo_urls, 1), 0),
        'older_than_days', _older_than_days
      )
    );

    update public.requests
       set photo_urls = array[]::text[],
           location   = st_setsrid(st_makepoint(0, 0), 4326)::geography,
           symptom_json = '{}'::jsonb
     where id = r.id;

    request_id := r.id;
    photo_urls := r.photo_urls;
    return next;
  end loop;
end$$;

revoke all on function public.purge_stale_request_data(int) from public;
grant execute on function public.purge_stale_request_data(int) to service_role;
