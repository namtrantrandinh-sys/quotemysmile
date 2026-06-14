# QuoteMySmile — Ship Checklist

Status as of 2026-06-14. Tick items as you complete them.

## Before first paying user

### Auth
- [ ] **Enable Twilio in Supabase** — Authentication → Providers → Phone. Set Twilio account SID, auth token, and phone number. Free tier ~$1/mo + $0.05/SMS in AU.
- [ ] Test phone signup with your own number end-to-end.
- [ ] OR enable email magic link as dev fallback — already wired in `lib/services/auth.ts:signInWithEmail`.

### Dentist verification
- [ ] **Get ABR_GUID** from `abr.business.gov.au/Tools/WebServices` (free, instant).
- [ ] `npx supabase login`
- [ ] `npx supabase link --project-ref mqlaoxcjebzsihiocmzm`
- [ ] `npx supabase secrets set ABR_GUID=<your-guid>`
- [ ] `npx supabase functions deploy abn-lookup`
- [ ] **Bootstrap your admin user**: sign in once, then in SQL editor:
      `update public.users set role='admin' where id='<your-uuid>';`
- [ ] Verify the `/admin` screen renders the pending clinic queue.

### Final migrations (apply via SQL editor)
- [x] 0001 initial schema
- [x] 0002 fix quotes RLS
- [x] 0003 storage photos bucket
- [x] 0004 quote count + competitor RPCs
- [ ] **0006 AHPRA note check trigger** — `supabase/migrations/0006_ahpra_note_check.sql`

### Real device testing
- [ ] `npm run ios` — verify camera modal, photo capture, GPS request, reverse geocode all work.
- [ ] `npm run android` — same flow.
- [ ] Submit a real request end-to-end. Photos should land in `request-photos` bucket. Request row should have a PostGIS POINT and 30-min `closes_at`.
- [ ] Sign up a second test account as a dentist, geocode a real Melbourne address, submit a quote on the patient's request. Verify Realtime arrival in the patient's live feed.
- [ ] Use the requote-once path. Confirm DB triggers `status='final'` and `locked_at`.
- [ ] Book a consult. Confirm `bookings` row inserted.

### Privacy + legal
- [ ] Replace `[ABN PLACEHOLDER]` in `app/legal/privacy.tsx` with your business ABN.
- [ ] Have privacy + terms reviewed by a healthcare lawyer (Maddocks / Holding Redlich / Mirza Health Law). Budget ~$500–$1000 for a 1-hr review.

### App Store / Play Store prep
- [ ] Replace placeholder icon and splash in `app.json`.
- [ ] App Store privacy nutrition labels (location, photos, name, phone, contacts: none).
- [ ] AHPRA-compliant App Store description (no outcome claims).
- [ ] Production EAS build: `npx eas build --platform ios` (needs Apple Developer account, ~AUD$149/yr).

### Operational
- [ ] Wire `lib/observability.ts` to Sentry — add `@sentry/react-native`, set DSN in `.env`, replace the console calls.
- [ ] Set up Supabase log drains or Sentry tracing for the edge function.
- [ ] Add a budget/billing alert in Supabase dashboard (Free tier still has compute caps).

## v1.1 backlog (post-launch)

- [ ] AHPRA register scrape — weekly job that verifies registrations are still active.
- [ ] Stripe Connect for dentist payouts.
- [ ] `expo-notifications` push + tiered geofence delivery (5/15/30km).
- [ ] In-app messaging between patient and booked dentist.
- [ ] Real Laplacian-variance photo quality via `react-native-vision-camera` frame processor.
- [ ] Calendar sync (Cliniko / Dentally / Praktika OAuth).
- [ ] Dentist subscription billing ($149/mo Active Dentist after free 90-day window).
- [ ] AHPRA marketing review — get sign-off on App Store listing copy + onboarding.

## v2 ideas (not blocking)

- Whitening flow polish (shade picker visuals, dentist note guardrails).
- Emergency 5-min express window for urgent dental.
- Considered 24-hour window for implants / ortho.
- iPad-optimised dentist dashboard.

## Useful commands

```bash
# Run on real device (recommended for camera / GPS work)
npm run ios

# Run web preview (no camera, GPS only mocked)
npm run web

# Push a migration to the live DB
# (or paste into SQL editor at https://supabase.com/dashboard/project/mqlaoxcjebzsihiocmzm/sql/new)

# Deploy edge function
npx supabase functions deploy abn-lookup --project-ref mqlaoxcjebzsihiocmzm

# Verify table health
curl -s -o /dev/null -w "%{http_code}\n" \
  https://mqlaoxcjebzsihiocmzm.supabase.co/rest/v1/quotes?limit=0 \
  -H "apikey: $EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
```
