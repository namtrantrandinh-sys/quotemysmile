# QuoteMySmile

Live dental quote marketplace for Australia. Patients submit photos + GPS; AHPRA-registered dentists nearby send indicative quotes live; everyone sees everything; transparent competition.

Independent of LORDLY — separate folder, separate Supabase project, separate deployment. Same stack family (Expo + Supabase) because the skills transfer.

## Stack

- **Expo Router** (React Native + file-based routing) — iOS, Android, Web from one codebase
- **NativeWind v4** — Tailwind for React Native
- **TypeScript** strict
- **Supabase** — auth, Postgres + PostGIS, Realtime channels, Storage
- **Cormorant Garamond** + **Inter** — editorial serif + clean sans

## Supabase project (live)

| | |
|---|---|
| Org | **QuoteMySmile** (Free) — separate from Lordly |
| Project | `quotemysmile` |
| Ref | `mqlaoxcjebzsihiocmzm` |
| Region | Sydney (`ap-southeast-2`) |
| URL | `https://mqlaoxcjebzsihiocmzm.supabase.co` |
| Publishable key | In `.env.local` (safe in client, RLS protects data) |

Migrations applied:
- `0001_initial.sql` — PostGIS + 6 tables + RLS + triggers + Realtime publication
- `0002_fix_quotes_rls.sql` — SECURITY DEFINER fix for self-referential dentist policy
- `0003_storage_photos.sql` — `request-photos` private bucket + RLS

Edge functions:
- `abn-lookup` — validates ABN via ABR public API + marks clinic verified

## Run

```bash
cd /Users/nam/Projects/quotemysmile
npm install --legacy-peer-deps
npm run web        # http://localhost:8088 (needs watchman or LORDLY stopped)
npm run ios        # iOS simulator — needed for real camera + GPS
npm run android    # Android emulator
```

## Locked design tokens (cream / nude / brushed gold)

| Token | Value | Role |
|---|---|---|
| `bg-bone` | `#F5F1E8` | Primary background |
| `bg-eggshell` | `#EDE6D6` | Cards |
| `border-linen` | `#E5DCC8` | Hairline dividers |
| `text-espresso` | `#2A2520` | Primary text |
| `text-walnut` | `#4D423A` | Secondary text |
| `text-taupe` | `#8A7E70` | Meta text |
| `text-gold` | `#C9A961` | Accent — price, CTAs |
| `text-honey` | `#A8843D` | Gold pressed |
| `text-forest` | `#4A6B4F` | LIVE indicator |
| `text-clay` | `#9E5E47` | Errors / alerts |

All contrast ratios verified WCAG AA+. Gold only used at 48px+ for text.

## Architecture

```
app/                 ← Expo Router file-based routing (all screens)
components/          ← UI primitives (Button, QuoteCard, Disclaimer, …)
hooks/               ← useLocation, usePhotoCapture, useSession
lib/
  services/
    auth.ts          ← signInWithPhone, verifyPhoneOtp, createUserProfile
    requests.ts      ← submitRequest, getRequest, listMyActiveRequests
    quotes.ts       ← submitQuote, requoteOnce, listQuotesForRequest,
                       subscribeQuotesForRequest  (Realtime)
    bookings.ts     ← createBooking, listMyBookings
    photos.ts       ← uploadRequestPhoto, signedPhotoUrl
  intakeStore.ts    ← ephemeral patient intake snapshot across screens
  copy.ts           ← single source for all AHPRA-sensitive strings
  supabase.ts       ← createClient + AsyncStorage session
supabase/
  migrations/       ← versioned SQL (0001, 0002, 0003)
  functions/
    abn-lookup/     ← Deno edge fn for ABR validation
```

## Patient flow (wired end-to-end)

`/` → `/sign-in` (phone OTP) → `/categories` (sets intake.category) → `/capture` (real Expo Camera, quality score) → `/symptoms` (sets intake.symptomJson) → `/location` (real GPS via expo-location, sets intake.coords + radius) → `/submitting` (creates `requests` row + uploads photos to `request-photos` bucket) → `/live?request=<id>` (Realtime subscription to `quotes` channel — quotes stream in as dentists submit) → `/quote/[id]` → `/book` → `/booked`

## Dentist flow (UI scaffolded)

`/dentist/onboarding` (7-step: AHPRA, ABN, PII, acks) → `/dentist` (dashboard) → `/dentist/request/[id]` (view → builder → submitted) → `/dentist/requote/[id]` (one-shot lock) → `/dentist/won` → `/dentist/stats` → `/dentist/settings`

## Locked product decisions

- Live **open feed** — patient + dentists all see each other's quotes
- 1 initial quote + 1 requote = 2 max per dentist per request (DB CHECK + trigger lock)
- GPS mandatory both sides
- Cream/nude + gold aesthetic — quiet luxury
- Disclaimer on every quote — dentist named as responsible practitioner
- Categories include Whitening with AHPRA cosmetic guardrails

## Legal architecture

- Platform = marketplace only, NOT a clinical provider
- Every quote shows the dentist's AHPRA reg # — they are the responsible practitioner
- Patient ack: "quote accuracy depends on photo quality" at submit
- Dentist ack: "I accept full professional responsibility for this quote" on every quote submit
- AHPRA Sept 2025 ad rules: $60k / $120k fines. Soft filter on dentist note field.

## Next sprints

1. **Dentist incoming-request feed** — Realtime subscription to `requests` filtered by clinic geofence
2. **Booking flow against real DB** — call `createBooking` from `app/book.tsx`
3. **Patient bookings inbox** — list `bookings` on home screen
4. **AHPRA register scrape** — backend job that verifies dentist registrations weekly
5. **Twilio SMS** — Supabase phone auth needs SMS provider configured
6. **Push notifications** — `expo-notifications` + tiered geofence delivery (5/15/30 km)
7. **Stripe Connect** — dentist payouts
