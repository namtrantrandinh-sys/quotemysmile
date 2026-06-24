-- ============================================================================
-- 0030 — Message attachments (image + short video) on booking chat
-- ============================================================================
-- After a patient accepts a quote, the dentist often needs additional photos
-- or a short video to refine the treatment plan ("can you send a close-up of
-- the lower-left molar?"). This migration extends the existing booking-scoped
-- messages table with optional attachment columns and adds a private storage
-- bucket scoped to the booking participants.
--
-- Path convention: <booking_id>/<sender_id>/<uuid>.<ext>
-- The booking_id is the first folder so the RLS check can resolve back to
-- the bookings table and confirm the requester is either the patient or the
-- clinic owner.
-- ============================================================================

-- Allow body to be empty when the message is attachment-only.
alter table public.messages
  drop constraint if exists messages_body_check;

alter table public.messages
  alter column body drop not null;

alter table public.messages
  add column if not exists attachment_url   text,
  add column if not exists attachment_kind  text
    check (attachment_kind in ('image', 'video')),
  add column if not exists attachment_mime  text,
  add column if not exists attachment_size  int,
  add column if not exists attachment_w     int,
  add column if not exists attachment_h     int;

-- A message must have either a body or an attachment (or both).
alter table public.messages
  add constraint messages_has_content check (
    (body is not null and char_length(body) between 1 and 2000)
    or attachment_url is not null
  );

comment on column public.messages.attachment_url is
  'Storage path inside the booking-chat-media bucket (NOT a public URL). Clients fetch a signed URL on demand.';

-- ----------------------------------------------------------------------------
-- Storage bucket — private, signed URLs only.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'booking-chat-media',
  'booking-chat-media',
  false,
  30 * 1024 * 1024,                          -- 30MB max (~15s 1080p H.264)
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ]
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- RLS — patient + clinic owner of the booking can read+write objects whose
-- first path segment matches a booking they participate in. Sender must be
-- the authenticated user (folder 2 = sender_id).
-- ----------------------------------------------------------------------------
create policy "booking chat upload"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'booking-chat-media'
  and (storage.foldername(name))[2] = auth.uid()::text
  and exists (
    select 1
      from public.bookings b
      left join public.clinics c on c.id = b.clinic_id
     where b.id::text = (storage.foldername(name))[1]
       and (b.patient_id = auth.uid() or c.owner_user_id = auth.uid())
  )
);

create policy "booking chat read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'booking-chat-media'
  and exists (
    select 1
      from public.bookings b
      left join public.clinics c on c.id = b.clinic_id
     where b.id::text = (storage.foldername(name))[1]
       and (b.patient_id = auth.uid() or c.owner_user_id = auth.uid())
  )
);

-- No update / no delete — chat history is immutable. If a user uploads the
-- wrong file they can send a follow-up text message; storage objects stay.
