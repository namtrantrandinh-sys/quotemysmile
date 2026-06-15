# QuoteMySmile — Apple App Store submission guide

Updated 2026-06-15.

## Codebase status

- `tsc --noEmit` — **clean** (0 errors)
- `expo config --full` — **loads** (expo-build-properties dependency installed 2026-06-15)
- iOS `PrivacyInfo.xcprivacy` — **complete** (7 data types, 4 required-reason APIs, no tracking)
- iOS Info.plist usage descriptions — **complete** (location, camera, mic, photo library)
- Android permissions — **complete**
- Stripe-null guard in `book.tsx` — **fixed** (no orphan booking rows)
- Live-feed countdown — **derives from real request urgency** (not the demo 24:48 default)
- Camera + video capture — **type-checked** (runtime untested, no Xcode tools yet)
- Marketing site live at https://quotemysmile.com.au — **deployed**
- App Store metadata draft — `/store/app-store-metadata.md`
- Privacy policy / terms / support pages — **published**

## Placeholders that must be replaced before `eas submit`

| File | Line | Placeholder | What it is |
| ---- | ---- | ----------- | ---------- |
| `app.json` | 12 | `REPLACE_WITH_EAS_PROJECT_ID` | EAS update URL — get after `eas init` |
| `app.json` | 18 | `REPLACE_WITH_EAS_PROJECT_ID` | EAS project id (same value as above) |
| `app.json` | 21 | `REPLACE_WITH_EXPO_OWNER` | Your Expo account / org slug |
| `app.json` | 36 | `REPLACE_WITH_IOS_GOOGLE_MAPS_KEY` | iOS Google Maps SDK key |
| `app.json` | 49 | `REPLACE_WITH_ANDROID_GOOGLE_MAPS_KEY` | Android Google Maps SDK key |
| `eas.json` | 52, 63 | `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` | ASC app id (from App Store Connect after you create the app record) |
| `eas.json` | 53, 64 | `REPLACE_WITH_APPLE_TEAM_ID` | 10-char team id from developer.apple.com → Membership |

EAS env vars (`EXPO_PUBLIC_*`) live in `.env.local` and are bundled via `expo`'s build-time inlining. **They are already populated** for `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `EXPO_PUBLIC_SENTRY_DSN`, and both Google Maps keys.

## One-time setup (do once, in this order)

```bash
# 1. Apple Developer account ($A149/yr) — paid + active
#    https://developer.apple.com/programs/enroll

# 2. App Store Connect app record
#    https://appstoreconnect.apple.com → My Apps → +
#    Bundle ID: com.quotemysmile.app
#    Primary language: English (Australia)
#    SKU: qms-001
#    Copy the resulting "App ID" (numeric) into eas.json ascAppId

# 3. Get Apple Team ID
#    https://developer.apple.com/account → Membership → Team ID (10 chars)
#    Paste into eas.json appleTeamId (×2)

# 4. EAS project init
cd /Users/nam/Projects/quotemysmile
PATH=/Users/nam/.local/node/bin:$PATH npx eas-cli login
PATH=/Users/nam/.local/node/bin:$PATH npx eas-cli init    # creates EAS project, prints project id
#    Paste the printed id over both REPLACE_WITH_EAS_PROJECT_ID in app.json
#    Paste your Expo username/org over REPLACE_WITH_EXPO_OWNER

# 5. Google Maps SDK keys (Google Cloud Console)
#    https://console.cloud.google.com → APIs & Services → Credentials
#    Create 2 keys, restrict by:
#      - iOS: Bundle id = com.quotemysmile.app
#      - Android: Package = com.quotemysmile.app + SHA-1 from EAS credentials
#    Paste into app.json (lines 36, 49)

# 6. Stripe live keys
#    Already in .env.local? Verify EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY starts with pk_live_
#    (Currently in .env.local — confirm before first prod build)
```

## Build + submit

```bash
cd /Users/nam/Projects/quotemysmile

# Build for App Store (production profile)
PATH=/Users/nam/.local/node/bin:$PATH npx eas-cli build --platform ios --profile production

# After ~25 min the build lands in EAS. Submit to App Store Connect:
PATH=/Users/nam/.local/node/bin:$PATH npx eas-cli submit --platform ios --profile production
# Pick the build you just made → upload → TestFlight pre-processing (~30 min)
```

## App Store Connect — fill these manually (one time)

Copy from `/store/app-store-metadata.md`:

- Name (30 ch), Subtitle (30 ch)
- Promotional Text (170 ch)
- Description (4000 ch)
- Keywords (100 ch, comma-separated)
- Support URL: https://quotemysmile.com.au/support.html
- Marketing URL: https://quotemysmile.com.au/
- Privacy Policy URL: https://quotemysmile.com.au/privacy.html
- Age rating: 4+
- Primary category: Medical
- Secondary category: Health & Fitness
- Content rights: yes (own all content)
- Pricing: Free
- Availability: Australia (Tier 0)
- Sign-in info for App Review:
  - Email: `review@quotemysmile.com.au` (set up an inbox)
  - OTP/test account note: "We use email + SMS OTP. Email a one-time code to the review address. If a test SMS is required, please request via Resolution Centre — we'll generate a magic link."

## Screenshots required (per device size)

You need at least 3 screenshots per device size:
- 6.7" iPhone Pro Max (1290 × 2796) — required
- 6.5" iPhone Plus (1242 × 2688) — required
- 5.5" iPhone (1242 × 2208) — required for legacy

Generate from a Pro Max simulator (`xcrun simctl io booted screenshot` after `xcode-select --install`).

Suggested 3 frames (premium-dental positioning):
1. Sign-in / first-launch (wordmark + "Your dream smile, in your hand.")
2. Live quote feed (3 quotes streaming in — show mint badges)
3. Capture flow (camera with the 4-zone guide)

## Pre-submission checklist (last hour before clicking submit)

- [ ] All 9 `REPLACE_WITH_*` placeholders replaced
- [ ] `expo doctor` — no errors (`npx expo-doctor`)
- [ ] `tsc --noEmit` — clean
- [ ] `.env.local` `STRIPE_PUBLISHABLE_KEY` starts with `pk_live_` (not `pk_test_`)
- [ ] `.env.local` `SUPABASE_URL` points to production Supabase project
- [ ] Production Supabase migrations applied (`supabase db push --linked`)
- [ ] Production edge functions deployed (`supabase functions deploy`)
- [ ] Stripe webhook secret matches what `book/confirm-deposit` edge fn expects
- [ ] App icon 1024×1024 — `assets/icon.png` (confirmed ✓)
- [ ] Splash 2048×2048 — `assets/splash.png` (confirmed ✓)
- [ ] Privacy manifest matches what app actually does — `/store/PrivacyInfo.xcprivacy` (confirmed ✓)
- [ ] Review screenshots uploaded (3 × 3 sizes minimum)
- [ ] App Review notes filled (mention AHPRA fee model + free for patients)

## Outstanding limitations to disclose in App Review notes

- "QuoteMySmile is a marketplace introducing patients to AHPRA-registered Australian dentists. We never charge patients. The A$5 platform fee is paid by the dentist on attended bookings."
- "Photos and location are stored privately and deleted after 30 days. Patients can delete at any time from Settings."
- "We use Stripe for the refundable platform security deposit. The deposit is held by QuoteMySmile (not the clinic) and refunded in full when the patient attends."

## After approval

```bash
# Promote a TestFlight build to production once tested:
PATH=/Users/nam/.local/node/bin:$PATH npx eas-cli channel:edit production --branch production
# Or just click "Add for Review" in App Store Connect → Submit for Review
```

Typical Apple review turnaround: 24–72 hours.
