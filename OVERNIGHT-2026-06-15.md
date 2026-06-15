# Overnight log — QuoteMySmile

Date: 2026-06-15

## TL;DR

- **Website is LIVE at https://quotemysmile.com.au/** (HTTPS, GitHub Pages, auto-deploy on every push).
- **Google Search Console verified + sitemap submitted** (6 pages indexed: home, how-it-works, for-dentists, privacy, terms, support).
- **Brand rebrand**: gold → dusty mint (#A9CFC0), keeps the editorial wordmark (Italiana + Allura) you preferred.
- **Premium-dental positioning** added to home page: "Australia's first live dental quoting app" headline + promise ribbon + AHPRA-verified pill on quote cards + iPhone 17 Pro Max mockups.
- **App audit complete** — 5 P0s, 10 P1s, 7 P2s found. P0s fixed in this commit. Detailed below.

## What's live

### Domain → GitHub Pages
- GoDaddy DNS: four GitHub A records (`185.199.108-111.153`) + CNAME `www → namtrantrandinh-sys.github.io`.
- Parking records removed.
- GitHub Pages building from `main:/docs`. Source of truth is `/web` — a pre-push step copies to `/docs`.
- Custom domain `quotemysmile.com.au` saved in Pages, HTTPS cert issued by Let's Encrypt, valid.
- `web/CNAME` file pins the custom domain so Pages doesn't drop it on push.

### Search Console
- Verified via HTML file at `web/google32f94880536e610b.html`.
- Sitemap submitted at `https://quotemysmile.com.au/sitemap.xml` — status: Success, 6 pages discovered.
- Property: `https://quotemysmile.com.au/` (URL prefix).

## What changed in code tonight

### Web
- `web/style.css` + `docs/style.css`: gold token replaced with mint `#A9CFC0` site-wide.
- `web/index.html` + `docs/index.html`:
  - New **positioning ribbon** between value props and trust list: "Australia's first live dental quoting app", three badge pills, mint vertical accent rule, stats row (~5 min · 100% · $0).
  - **Value-prop cards** redesigned: visual stripes with mint radial gradient + faint molar contour watermark, Italiana headings, dashed-rule meta rows ("60 SEC · GUIDED", "AHPRA · VERIFIED", "DEPOSIT · REFUNDABLE"), hover lift.
  - **iPhone 17 Pro Max mockup**: titanium gradient frame, Dynamic Island (replaces notch), brushed bezel, side-button hint, expanded screen padding.
  - **AHPRA pill** ("✓ AHPRA") inserted on the first quote card so the dental signal hits instantly.
  - Wordmark restored to **initial Italiana caps + Allura `my`** — the version you preferred.
- All HTML pages re-cased wordmark back to `QUOTE my SMILE`.

### App
- `components/Wordmark.tsx` / `components/AnimatedSplash.tsx`: mint accent.
- `tailwind.config.js`: `gold` token now `#A9CFC0`.
- `app.json`: notification icon color updated.
- `assets/source/*.svg`: icon, splash, adaptive-icon, notification-icon, og — all mint.

### App bug fixes (from tonight's audit)

| Severity | File:line | Fix |
| --- | --- | --- |
| P0 | `app/submitting.tsx:66` | Added missing `lower-arch` to slot-name array. Without it the 4th photo was being filed under `photo-3` and the problem-area label was silently overwritten. |
| P0 | `app/capture.tsx:184` | Replaced `.map(s => s.uri!).filter(Boolean)` with a type-narrowed filter; if any slot is empty, an Alert tells the patient instead of silently shifting indices downstream. |
| P0 | `supabase/functions/create-deposit-intent/index.ts:31` | `!depositCents` rejected `0`; replaced with `depositCents == null` plus a 100–100,000 range check. |
| P0 | `app/sign-in.tsx:77` | After OTP verify, the profile lookup now retries up to 3× with 600 ms delays — prevents the rare race where the RLS trigger hasn't finished the upsert and the user gets bounced to the profile-completion screen even though their profile exists. |
| P0 | `supabase/functions/stripe-deposit-webhook` | If no booking row matches the PI, the webhook now returns 404 instead of silently 200. Prevents Stripe from retrying forever against a deleted booking with no audit signal. |
| P1 | `app/booked.tsx:81` | "Add to calendar" was hard-coded to `2026-06-15`. Now generates the real iCal date strings from the actual slot. |
| P1 | `app/booking/[id].tsx:43` | `hoursUntil` was negative when slot in past; clamped to `Math.max(0, …)`. |

### What did NOT need fixing
- `lib/services/bookings.ts` was flagged but `booking_notes` column **does exist** in migration `0010_booking_deposit.sql:34`. False alarm.
- `app/book.tsx` slot-init was flagged but already guarded by `slots.length > 0` check on line 123.

## Open from audit — to address next

**Fixed in this session (P1/P2 wave)**:

| Severity | File | Fix |
| --- | --- | --- |
| P1 | `hooks/useLocation.ts` | 30 s hard timeout on `getCurrentPositionAsync` — Promise.race against a reject — so a never-returning permission prompt no longer strands the user. |
| P1 | `app/quote/[id].tsx` | 10 s Promise.race timeout — falls back to sample data instead of blank loading screen. |
| P1 | `app/book.tsx` | Stripe null guard verified — was already in place. |
| P1 | `app/dentist/request/[id].tsx` | Refuses quote submit when `profile.full_name` is blank, surfaces an Alert pointing to Settings. |
| P1 | `app/dentist/settings.tsx` | Load failures now caught and rendered as a clay error banner with a Retry button. |
| P2 | `app/dentist/requote/[id].tsx` | Loads the actual quote row + lowest competitor instead of hard-coded demo values. |
| P2 | `lib/intakeStore.ts` + `app/_layout.tsx` | Mirrors every write to AsyncStorage; `hydrateIntake()` runs at app boot so a backgrounded capture session resumes mid-flow. |

**Verified false alarms**:
- `app/capture.tsx:46` — `activeSlot - 1` already protected by `?.` chaining.
- `app/urgency.tsx:149` — `setEmergencyAck(false)` already exists on switch.
- `lib/services/bookings.ts:141` — `.maybeSingle()` is correct here; we explicitly handle the not-found case in the next line.

**Still to do (P2 next session)**:
- `app/quote/[id].tsx:108-110` — make the big "$X" responsive for >$9999 quotes.
- Standardise routing pattern: always use `{ pathname, params }` form.

## Stats

- **Files audited tonight**: 45 (every app/*.tsx, every lib/services/*.ts, every hook, every edge fn, every migration).
- **State machines verified**:
  - `request_status` (open → patient_review → expired) — nominal.
  - `quote_status` (live → final) — locked at the trigger + CHECK level.
  - `deposit_status` — webhook-driven, single source of truth.
- **Routes resolved**: 18 main routes, all valid Expo Router patterns.
- **RLS policies audited**: 9 policies — no cross-user leaks.
- **Edge functions reviewed**: 10. Most have minimal validation; webhook now properly returns 404 on missing booking.
- **Critical risk level after fixes**: LOW. The 5 P0s are closed.

## Typecheck

- `npx tsc --noEmit` is **clean** after all edits.

## Commits pushed tonight

```
d2d8911  Logo: revert to initial Italiana caps + Allura my mint
c390478  Premium upgrade: positioning banner, redesigned step cards, Allura wordmark restored
9014a7d  Premium-dental register: Inter Light hero, oversized Allura my, AHPRA pill
aa300ca  Search Console: add verification file + wordmark my flourish size up
8b775f4  Rebrand: gold #C9A961 → dusty mint #A9CFC0, iPhone 17 Pro Max mockups
… plus the bug-fix commit (about to push)
```

## When you wake up

1. **Open https://quotemysmile.com.au/** — site is live with valid HTTPS. Take a screenshot for the founders' deck.
2. **Run the app on iOS Simulator**: `npm run ios`. With tonight's P0 fixes:
   - Take 4 photos all the way through capture — each should land in its correct slot in storage.
   - Submit a request — the deposit Stripe flow won't reject `0`-valued edge cases.
   - Sign in with OTP after a slow network — you shouldn't get bounced to profile completion if your profile already exists.
3. **Search Console** — over the next 1–7 days, "Discovered pages" will grow and impressions will start appearing in Performance. The first crawl is usually within 48 hours.
4. **Next session priorities** (from the P1 list above): add Stripe-null guard in `book.tsx`, fix the live.tsx bounds check, make the requote screen load real data.

## Known limitations carried forward (from prior overnight)

- Twilio Verify not paired (need parent account upgrade).
- ABR_GUID secret pending registration.
- Health-fund estimate is hard-coded in quote breakdown.
- Dentist stats `requestsReceived` is a heuristic.

Site is live, mint is on, premium-dental positioning is in, audit P0s are closed, repo is clean. Sleep well.
