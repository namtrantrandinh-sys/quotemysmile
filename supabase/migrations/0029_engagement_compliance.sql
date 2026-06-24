-- ============================================================================
-- 0029 — Engagement + AHPRA compliance bundle
-- ============================================================================
-- Bundles the schema for several patient-engagement and compliance features
-- shipped together in build 27+:
--
--  1. AHPRA s.133 review filter   (server-side trigger on public.reviews)
--  2. Booking reminders           (bookings.reminders_sent text[] tracking)
--  3. Dormant-patient reactivation (users.last_reactivation_at — debounce)
--  4. Smile Score                  (users.smile_score, smile_score_at)
--  5. Post-booking patient intake  (bookings.patient_intake_json)
--  6. pg_cron schedule for the    send-booking-reminder + reactivate-dormant
--     edge functions.
--
-- Note: pg_cron + pg_net already enabled by 0024.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- (1) AHPRA s.133 review filter — block testimonials referencing clinical care
-- ---------------------------------------------------------------------------
-- The list mirrors REVIEW_CLINICAL_TERMS in lib/copy.ts. Source of truth is
-- the server because the client can be skipped by a determined user. If a
-- term lands inside a review body the insert/update is rejected. The patient
-- can still leave a star rating with no body.
create or replace function public.check_review_clinical_terms()
returns trigger language plpgsql as $$
declare
  v_lower text;
  v_term text;
  v_terms text[] := array[
    'filling', 'fillings', 'crown', 'crowns', 'veneer', 'veneers',
    'implant', 'implants', 'root canal', 'extraction', 'extracted',
    'extract', 'whitening', 'bleaching', 'scaling', 'cleaning',
    'polish', 'polishing', 'fluoride', 'braces', 'aligner', 'aligners',
    'retainer', 'denture', 'dentures', 'bridge', 'filled', 'drilled',
    'drilling', 'anaesthetic', 'anaesthesia', 'anesthetic', 'anesthesia',
    'numb', 'numbed', 'x-ray', 'xray',
    'result', 'results', 'outcome', 'outcomes', 'fixed', 'cured',
    'healed', 'treated', 'diagnosed', 'diagnosis', 'abscess',
    'infection', 'decay', 'cavity', 'cavities', 'gum disease',
    'gingivitis', 'periodontitis', 'pain gone', 'no more pain',
    'painless', 'before and after'
  ];
begin
  if new.body is null or length(trim(new.body)) = 0 then
    return new;
  end if;
  v_lower := lower(new.body);
  foreach v_term in array v_terms loop
    -- Word-boundary match so "extra" doesn't trip "extraction"
    if v_lower ~ ('\m' || regexp_replace(v_term, '([.*+?^${}()|[\]\\])', '\\\1', 'g') || '\M') then
      raise exception
        'review_clinical_terms_violation: review references clinical treatment ("%"). AHPRA s.133 prohibits testimonials about clinical care.', v_term
      using errcode = '23514';
    end if;
  end loop;
  return new;
end$$;

drop trigger if exists reviews_clinical_filter on public.reviews;
create trigger reviews_clinical_filter
  before insert or update of body on public.reviews
  for each row execute function public.check_review_clinical_terms();

-- ---------------------------------------------------------------------------
-- (2) Booking reminders tracking
-- ---------------------------------------------------------------------------
-- Array of tier names already sent for this booking. The reminder edge fn
-- skips a booking when its tier appears here, so a re-run can't double-send.
alter table public.bookings
  add column if not exists reminders_sent text[] not null default array[]::text[];

create index if not exists bookings_slot_status_idx
  on public.bookings(slot, status)
  where status = 'confirmed';

-- ---------------------------------------------------------------------------
-- (3) Dormant-patient reactivation debounce
-- ---------------------------------------------------------------------------
-- The reactivation edge fn checks the user's last request + this column so
-- we never spam (max once per 90 days).
alter table public.users
  add column if not exists last_reactivation_at timestamptz;

-- ---------------------------------------------------------------------------
-- (4) Smile Score
-- ---------------------------------------------------------------------------
-- Stored as a numeric(3,1) so 7.5/10 fits cleanly. answers_json holds the
-- patient's raw quiz answers so we can recompute or revise scoring without
-- re-prompting.
alter table public.users
  add column if not exists smile_score numeric(3,1) check (smile_score is null or (smile_score >= 0 and smile_score <= 10)),
  add column if not exists smile_score_at timestamptz,
  add column if not exists smile_score_answers jsonb;

-- ---------------------------------------------------------------------------
-- (5) Post-booking patient intake
-- ---------------------------------------------------------------------------
-- Patient med history / allergies / current meds, surfaced to the dentist
-- before the consult. Stored as a single jsonb blob on the booking row so
-- RLS reuses the existing booking policies without a new table.
alter table public.bookings
  add column if not exists patient_intake_json jsonb,
  add column if not exists patient_intake_at timestamptz;

-- ---------------------------------------------------------------------------
-- (6) pg_cron schedules — booking reminders + dormant reactivation
-- ---------------------------------------------------------------------------
-- Booking reminders: scan every 30 min. The edge function picks bookings
-- where (slot - now) falls into the 48h or 2-4h windows and the tier
-- isn't already in reminders_sent.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'qms_send_booking_reminders') then
    perform cron.unschedule('qms_send_booking_reminders');
  end if;
end$$;

select cron.schedule(
  'qms_send_booking_reminders',
  '*/30 * * * *',
  $cmd$
    select net.http_post(
      url := 'https://mqlaoxcjebzsihiocmzm.supabase.co/functions/v1/send-booking-reminder',
      headers := jsonb_build_object(
        'Content-Type',         'application/json',
        'X-QMS-Cron-Secret',    (select decrypted_secret from vault.decrypted_secrets where name = 'qms_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cmd$
);

-- Dormant patients: once weekly, Mondays 22:00 UTC (Tuesday 08:00 AEST).
do $$
begin
  if exists (select 1 from cron.job where jobname = 'qms_reactivate_dormant_weekly') then
    perform cron.unschedule('qms_reactivate_dormant_weekly');
  end if;
end$$;

select cron.schedule(
  'qms_reactivate_dormant_weekly',
  '0 22 * * 1',
  $cmd$
    select net.http_post(
      url := 'https://mqlaoxcjebzsihiocmzm.supabase.co/functions/v1/reactivate-dormant',
      headers := jsonb_build_object(
        'Content-Type',         'application/json',
        'X-QMS-Cron-Secret',    (select decrypted_secret from vault.decrypted_secrets where name = 'qms_cron_secret')
      ),
      body := '{}'::jsonb
    );
  $cmd$
);
