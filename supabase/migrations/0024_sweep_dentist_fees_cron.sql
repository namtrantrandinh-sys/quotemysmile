-- 0024_sweep_dentist_fees_cron
--
-- Schedules the monthly platform-fee sweep that bills each dentist for the
-- A$5/attended-booking accrued in events.dentist.fee_owed.
--
-- Fires at 01:30 UTC on the 1st of every month, well-spaced from any other
-- daily/hourly jobs to keep DB load smooth.
--
-- Auth: the edge function is deployed with --no-verify-jwt, so the only
-- gate is the X-QMS-Cron-Secret header. We store that secret in Supabase
-- Vault so it isn't visible in the pg_cron job listing.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Store the cron secret in Vault. The Edge Function env-var copy
-- (set via `supabase secrets set PURGE_CRON_SECRET=...`) is what the
-- function reads to validate; this Vault copy is what pg_cron sends.
-- They must match.
do $$
declare
  v_secret text := 'aebd86a10f9deb6ee49c351f0bdb9835b39bea2e2cbf5dfa9fe7ad765355a23b';
begin
  -- vault.create_secret throws if it already exists; upsert via delete-then-insert
  delete from vault.secrets where name = 'qms_cron_secret';
  perform vault.create_secret(v_secret, 'qms_cron_secret', 'QMS sweep-dentist-fees cron auth');
end$$;

-- Remove any prior schedule so this migration is idempotent.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'qms_sweep_dentist_fees_monthly') then
    perform cron.unschedule('qms_sweep_dentist_fees_monthly');
  end if;
end$$;

-- Schedule: 01:30 UTC on day 1 of every month.
select cron.schedule(
  'qms_sweep_dentist_fees_monthly',
  '30 1 1 * *',
  $cmd$
    select net.http_post(
      url := 'https://mqlaoxcjebzsihiocmzm.supabase.co/functions/v1/sweep-dentist-fees',
      headers := jsonb_build_object(
        'Content-Type',         'application/json',
        'X-QMS-Cron-Secret',    (select decrypted_secret from vault.decrypted_secrets where name = 'qms_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cmd$
);
