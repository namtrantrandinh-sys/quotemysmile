#!/usr/bin/env bash
# ============================================================================
# verify-migrations.sh — apply every migration to a clean local Postgres
# ============================================================================
# Spins a throwaway Postgres in Docker, applies every supabase/migrations/*.sql
# in order, runs a couple of sanity checks against the resulting schema.
#
#   ./scripts/verify-migrations.sh
#
# Exits non-zero on first apply failure.
# Pre-reqs: docker + psql (`brew install libpq postgresql`).
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."

CONTAINER="qms-migrations-verify"
PORT=54329
DB=postgres
USER=postgres
PASS=postgres

cleanup() {
  docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "→ Booting throwaway Postgres + PostGIS on :$PORT"
docker run -d \
  --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=$PASS \
  -e POSTGRES_DB=$DB \
  -p $PORT:5432 \
  postgis/postgis:16-3.4 >/dev/null

# Wait for ready
for i in $(seq 1 30); do
  if PGPASSWORD=$PASS psql -h localhost -p $PORT -U $USER -d $DB \
      -c 'select 1' >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

# Bootstrap auth.users so RLS policies referencing it compile.
# (Supabase's auth schema is provided by their managed service; we stub the
# bits the migrations reference so the schema applies cleanly.)
PGPASSWORD=$PASS psql -h localhost -p $PORT -U $USER -d $DB <<'SQL'
create schema if not exists auth;
create extension if not exists pgcrypto;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  phone text,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable
as $$ select '00000000-0000-0000-0000-000000000000'::uuid $$;
-- service_role role for grant statements
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role;
  end if;
end$$;
-- storage stub for migration 0003
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text not null, public boolean not null default false,
  file_size_limit int, allowed_mime_types text[]
);
create table if not exists storage.objects (
  bucket_id text, name text, owner uuid, created_at timestamptz default now()
);
create or replace function storage.foldername(_n text) returns text[]
language sql immutable
as $$ select string_to_array(_n, '/') $$;
-- realtime stub for 0001 alter publication
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end$$;
SQL

echo "→ Applying migrations…"
for f in supabase/migrations/*.sql; do
  name=$(basename "$f")
  printf "   %-40s … " "$name"
  if PGPASSWORD=$PASS psql -h localhost -p $PORT -U $USER -d $DB \
        -v ON_ERROR_STOP=1 -f "$f" >/tmp/qms-migrate.log 2>&1; then
    echo "ok"
  else
    echo "FAIL"
    echo "---- log ----"
    cat /tmp/qms-migrate.log
    exit 1
  fi
done

echo "→ Sanity checks…"
PGPASSWORD=$PASS psql -h localhost -p $PORT -U $USER -d $DB -v ON_ERROR_STOP=1 <<'SQL'
-- Required tables exist
select
  count(*) filter (where t = 'users')           as users,
  count(*) filter (where t = 'requests')        as requests,
  count(*) filter (where t = 'quotes')          as quotes,
  count(*) filter (where t = 'bookings')        as bookings,
  count(*) filter (where t = 'clinics')         as clinics,
  count(*) filter (where t = 'messages')        as messages,
  count(*) filter (where t = 'stripe_events')   as stripe_events,
  count(*) filter (where t = 'lookup_audit')    as lookup_audit
from (
  select tablename t from pg_tables where schemaname = 'public'
) x;

-- RLS enabled on the sensitive tables
select tablename, rowsecurity
  from pg_tables
 where schemaname = 'public'
   and tablename in ('messages', 'bookings', 'requests', 'quotes', 'stripe_events')
 order by tablename;

-- The AHPRA gate trigger exists
select tgname from pg_trigger where tgname = 'quotes_require_ahpra';
SQL

echo
echo "✅ All migrations applied cleanly on a fresh DB."
