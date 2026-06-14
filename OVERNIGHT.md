# Overnight log — QuoteMySmile

Date: 2026-06-14

## What I did

### Live infrastructure

- **Linked Supabase CLI** to project `mqlaoxcjebzsihiocmzm` (Sydney).
- **Marked migrations 0001–0005 as already-applied** (they were applied via SQL editor earlier; CLI history was empty).
- **Applied migration 0006** (`ahpra_note_check.sql`) via `supabase db push` — AHPRA banned-terms trigger now live. Quote notes containing banned terms log a `quote.note_flagged` event for admin review.
- **Deployed `abn-lookup` edge function** via `supabase functions deploy`. Dashboard URL:
  https://supabase.com/dashboard/project/mqlaoxcjebzsihiocmzm/functions

### App wiring

- `app/quote/[id].tsx` — was using sample data, now loads the real quote row from Supabase with itemised ADA codes, dentist name, AHPRA #, clinic name. Falls back to sample data if not signed in.
- `app/book.tsx` — slot picker now builds from the dentist's actual `availability_slots`, mapping ISO timestamps directly. Booking insert uses the real `requestId` and `clinicId`.
- `app/booked.tsx` — formats ISO directly with Australian locale.
- `app/dentist/onboarding.tsx` — clinic creation now geocodes the typed address via `expo-location.geocodeAsync` (falls back to Melbourne if it fails). Service radius picker connects to the real `serviceRadiusKm` on the clinic insert.
- `app/dentist/request/[id].tsx` — fetches the real patient request, displays the symptom note, and renders the 3 patient photos via `signedPhotoUrl` (10-minute signed URLs).
- `app/dentist/stats.tsx` — connected to a new `lib/services/stats.ts` that aggregates real quotes + bookings over the dentist's last 30 days.
- `app/dentist/won.tsx` — now reads from `listClinicBookings()` and shows the most upcoming or most recent booking.
- `app/inbox.tsx` (new) — patient bookings inbox with upcoming / past sections.
- `app/index.tsx` — adds "My inbox" link when signed in, Terms + Privacy in footer.
- `app/live.tsx` — countdown now flips the screen to a "Window closed" state at 0; typing indicator now reads real presence broadcasts from dentists who open the quote builder.
- `app/_layout.tsx` — Sentry observability is initialised at app boot via dynamic import.

### New components / services / hooks

- `components/RadiusPreview.tsx` — editorial concentric-rings visual of the service radius (no map dep).
- `lib/services/stats.ts` — dentist stats aggregation.
- `lib/services/bookings.ts:listClinicBookings()` — dentist-side bookings list.
- `lib/services/quotes.ts:broadcastTyping()` + `subscribeTyping()` — Realtime presence so the live feed shows "Dr X is preparing a quote" the moment a dentist opens the quote builder.
- `lib/observability.ts` — Sentry wrapper. Reads `EXPO_PUBLIC_SENTRY_DSN`. No-op if not set. Dynamic import so missing DSN never crashes the app.
- `@sentry/react-native` installed.

### AHPRA / safety

- AHPRA banned-terms trigger is **live in the database** as of this session. Every dentist quote insert/update with a banned phrase in the note auto-creates a `quote.note_flagged` audit event.
- The `/admin` queue already reads this; admin can review flagged notes alongside pending clinics.

### Typecheck

- `npx tsc --noEmit` is **clean** for app code.
- Edge function has Deno-typed imports (`https://esm.sh/...`, `Deno.serve`, `Deno.env`); errors there are expected and ignored because the function targets Deno on Supabase.

## What I did NOT do (and why)

### Twilio — partially done (subaccount created, Supabase paste pending)

- **Created** a new Twilio **subaccount** named **`QuoteMySmile`** under the existing Lordly master.
- Cleanly isolates resources (own SID, own Auth Token, own messaging logs) while sharing parent billing.
- **Credentials saved to `~/.qms_secrets/twilio.md`** (mode 600, owner-only, outside repo, never committed).
  - Account SID + Auth Token live there.
- **Pending you (30 sec):** Open in YOUR browser (not Claude in Chrome — the dashboard hangs in MCP):
  https://supabase.com/dashboard/project/mqlaoxcjebzsihiocmzm/auth/providers
  → Phone → enable Twilio → paste the SID + Auth Token from `~/.qms_secrets/twilio.md`.

### ⚠ Twilio Trial limitation (parent inheritance)

- Subaccounts inherit the parent's Trial status. **You cannot SMS to non-verified numbers** until the parent Lordly account is upgraded.
- **You cannot buy a QMS-owned AU phone number** on a Trial subaccount either.
- For dev right now: use parent's trial number `+19452959883` as the "from" in Supabase Phone provider config (it lives on parent SID, not QMS subaccount — so the configured Supabase Twilio creds **must be the parent SID + parent Auth Token** if you want SMS to dispatch at all).
- For production: upgrade Lordly Twilio (minimum $20), then buy an AU number on the QMS subaccount, then swap Supabase Auth to the QMS subaccount creds.

### Sentry — done ✅

- Created **new Sentry project `quotemysmile`** (React Native platform) inside the existing `lordly-gp` org.
- Sentry project URL: https://lordly-gp.sentry.io/projects/quotemysmile/
- **DSN written to `.env.local`** as `EXPO_PUBLIC_SENTRY_DSN` (DSNs are public by design — safe in client code).
- `lib/observability.ts` already initialises Sentry from this env var. Events start flowing automatically the next time the app boots.
- The project's slug is under the Lordly org but data (issues, releases, alerts) is fully isolated per project, just like Supabase project isolation.

### Blocked: ABR_GUID secret for `abn-lookup` edge function

- Function is deployed but no secret set. Register at:
  https://abr.business.gov.au/Tools/WebServices (free, instant)
- Once you have the GUID:
  ```bash
  cd /Users/nam/Projects/quotemysmile
  supabase secrets set ABR_GUID=<your-guid>
  ```

## Files added / changed

```
New:
  app/inbox.tsx
  app/admin/index.tsx                (created earlier this session)
  app/legal/privacy.tsx               (created earlier this session)
  app/legal/terms.tsx                 (created earlier this session)
  components/RadiusPreview.tsx
  lib/observability.ts                (replaced — Sentry wrapper)
  lib/services/admin.ts               (created earlier this session)
  lib/services/dentist.ts             (created earlier this session)
  lib/services/stats.ts
  supabase/migrations/0006_ahpra_note_check.sql

Modified:
  app/_layout.tsx                     (observability init)
  app/book.tsx                        (real slot ISO mapping)
  app/booked.tsx                      (real ISO formatting)
  app/dentist/index.tsx               (real Realtime feed, profile name)
  app/dentist/onboarding.tsx          (geocoding, radius picker, profile + clinic insert)
  app/dentist/request/[id].tsx       (real request load, photos, typing broadcast)
  app/dentist/requote/[id].tsx        (real requoteOnce)
  app/dentist/stats.tsx               (real stats hook)
  app/dentist/won.tsx                 (real latest booking)
  app/index.tsx                       (inbox link, Terms/Privacy footer, signed-in inbox)
  app/live.tsx                        (typing presence, countdown closed state)
  app/location.tsx                    (real GPS + radius slider bar)
  app/quote/[id].tsx                  (real quote fetch)
  app/symptoms.tsx                    (intakeStore propagation)
  app/categories.tsx                  (intakeStore propagation)
  app/capture.tsx                     (real expo-camera + intakeStore)
  lib/services/auth.ts                (no change tonight)
  lib/services/bookings.ts            (listClinicBookings added)
  lib/services/quotes.ts              (typing broadcast/subscribe added)
  lib/services/requests.ts            (getRequestForDentist added)
  hooks/usePhotoCapture.ts            (dimension-based quality score)
  hooks/useLocation.ts                (real expo-location)
  hooks/useSession.ts                 (created earlier)
  hooks/useUserProfile.ts             (created earlier)
  app.json                            (disabled typedRoutes)
  .env.example                        (added Sentry DSN slot)
```

## Where things stand

- **74 source files** (app + lib + components + hooks + supabase).
- **6 migrations on disk + applied to live DB** (0001–0006).
- **Edge function deployed** (`abn-lookup`).
- **`tsc --noEmit` clean.**
- **All 6 tables + storage bucket return 200 + Realtime publication healthy.**

## When you wake up

1. **Paste Twilio creds into Supabase Auth** (30 sec). Open in YOUR browser:
   https://supabase.com/dashboard/project/mqlaoxcjebzsihiocmzm/auth/providers
   → Phone → enable → paste from `~/.qms_secrets/twilio.md`
   → For "Twilio Phone Number" use `+19452959883` until you upgrade the parent.
2. **Get ABR_GUID** (60 sec at abr.business.gov.au/Tools/WebServices) and run:
   ```bash
   cd /Users/nam/Projects/quotemysmile
   supabase secrets set ABR_GUID=<your-guid>
   ```
3. **Run on iOS Simulator**: `npm run ios`. Walk the patient flow end-to-end. The web preview can't exercise camera or GPS.
4. **Bootstrap your admin user** once you've signed in:
   ```sql
   update public.users set role='admin' where id='<your-uuid>';
   ```
5. Open `/admin` to see the pending clinic queue.
6. **Sentry events** should start arriving in https://lordly-gp.sentry.io/projects/quotemysmile/ as soon as the app boots with the new `.env.local`.

## Known issues for the next session

- The patient inbox row tap is a no-op — there's no "booking detail" screen yet. Wire to a `/booked/[id]` route when needed.
- Quote breakdown's "Health fund estimate" is hard-coded to $120 Bupa Top Extras. Make this real or hide it.
- Dentist Stats `requestsReceived` is a heuristic (1.6× quotesSent). Replace with a true count when we add request-broadcast accounting.
- iOS Simulator location is fixed to Apple HQ (Cupertino) by default — set a Melbourne pin in Simulator → Features → Location → Custom Location for realistic testing.
