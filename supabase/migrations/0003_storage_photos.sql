-- ============================================================================
-- 0003 — Storage bucket for patient photos
-- ============================================================================
-- Private bucket; access via signed URLs only.
-- Path convention: <patient_id>/<request_id>/<slot>.jpg
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'request-photos',
  'request-photos',
  false,                       -- private
  6 * 1024 * 1024,             -- 6MB max per file
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- RLS: patients can upload only into their own folder (first path segment = auth.uid())
create policy "patients upload own photos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'request-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "patients read own photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'request-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "patients delete own photos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'request-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Dentists who are matched to the request can read its photos.
-- The match is checked via clinic.location ST_DWithin in app code; here we
-- gate on the request_id appearing in the dentist's clinic's geofence.
create policy "matched dentists read request photos"
on storage.objects for select
to authenticated
using (
  bucket_id = 'request-photos'
  and exists (
    select 1
    from public.requests r
    join public.clinics c on c.owner_user_id = auth.uid()
    where r.id::text = (storage.foldername(name))[2]
      and st_dwithin(c.location, r.location, r.radius_km * 1000)
      and r.status = 'open'
  )
);
