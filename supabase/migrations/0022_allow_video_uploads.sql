-- ============================================================================
-- 0022 — Allow video uploads in request-photos bucket
-- ============================================================================
-- Patients can now optionally record a short 15-second video clip of their
-- teeth as one of the four "photo" slots. We extend the bucket's allowed
-- mime types + bump the per-file size limit to 30 MB (a 15 s 1080p H.264
-- clip is comfortably under that).
--
-- Storage RLS policies (in migration 0003) are content-type-agnostic so
-- no policy changes needed.
-- ============================================================================

update storage.buckets
   set allowed_mime_types = array[
         'image/jpeg',
         'image/png',
         'image/webp',
         'video/mp4',
         'video/quicktime'
       ],
       file_size_limit = 30 * 1024 * 1024
 where id = 'request-photos';
