-- ============================================================================
-- 0006 — AHPRA note content check (server-side guard)
-- ============================================================================
-- Soft-blocks dentist quote notes that contain banned advertising terms.
-- Mirrors the client-side scanNote() helper in lib/ahpraFilter.ts.
--
-- IMPORTANT: We RAISE NOTICE rather than block. The platform cannot vet every
-- nuance — final responsibility rests with the dentist (acked at submit) and
-- moderation queue. This trigger flags for admin review without blocking
-- legitimate uses (e.g. "available today, results vary").
-- ============================================================================

create or replace function public.check_quote_note_terms()
returns trigger language plpgsql as $$
declare
  banned text[] := array[
    'guarantee', 'guaranteed', 'promise', 'promised',
    'best result', 'best smile', 'perfect smile',
    'painless', 'no pain', '100%', 'lifetime', 'forever',
    'best in', 'leading', 'top-rated', 'no.1', 'voted',
    'hollywood smile', 'celeb smile', 'snow white',
    'ultra-white', 'blinding white',
    'permanent whitening', 'safe for everyone'
  ];
  term text;
  found text[] := array[]::text[];
  note_lower text;
begin
  if new.note is null or length(new.note) = 0 then
    return new;
  end if;
  note_lower := lower(new.note);
  foreach term in array banned loop
    if position(term in note_lower) > 0 then
      found := array_append(found, term);
    end if;
  end loop;
  if array_length(found, 1) > 0 then
    -- Flag for admin review via events table — do NOT block insert.
    insert into public.events (actor_id, request_id, type, payload)
    values (
      new.dentist_id,
      new.request_id,
      'quote.note_flagged',
      jsonb_build_object('quote_id', new.id, 'matches', to_jsonb(found))
    );
  end if;
  return new;
end$$;

drop trigger if exists quotes_note_check on public.quotes;
create trigger quotes_note_check
  after insert or update of note on public.quotes
  for each row execute function public.check_quote_note_terms();
