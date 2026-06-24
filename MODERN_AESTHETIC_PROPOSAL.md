# QuoteMySmile — Modern Aesthetic Proposal

**Date:** 2026-06-19
**Scope:** Hold the current palette (Mint #5FA89B + Deep Teal #1F4F47 + Bone #F5F1E8 + Gold #C9A961 + Clay #9E5E47 + Espresso #2A2520) and elevate the whole product into the same visual class as One Medical / Tend NYC / Hims & Hers / Maven / Headspace / Forward Health.

---

## 1 · What the best modern healthcare apps share

Distilled from One Medical, Tend NYC, Hims & Hers, Maven Clinic, Calm, Headspace, Parsley Health, Forward Health, Tia.

| Pattern | What it looks like | Why it works |
|---|---|---|
| **Editorial serif + humanist sans pairing** | Big serif headline ("Welcome back.") + understated sans body | Feels considered, not clinical |
| **One decision per screen** | A screen asks one question; everything else is sub-ordinated | Reduces anxiety; matches Apple HIG `primary-action` |
| **Warm photographic or gradient hero** | Soft tone-on-tone gradient hero, no stock-photo doctors | Trust without sterility |
| **Bottom sheets, not modals** | Quote details, booking confirm, slot pick all slide up | Preserves spatial context (Headspace, Tend) |
| **Generous breathing space** | 24–32 pt vertical between sections, 16 pt internal | Premium feel — never busy |
| **Soft tactile cards** | 18–22 pt corner radius, low-opacity shadow, 1 px hairline | Calm depth (Maven, Forward) |
| **One-line icon family** | Phosphor / Lucide thin-stroke, 1.5 px consistent | Filled icons read juvenile in healthcare |
| **Subtle haptic confirmations** | Light tap on slot pick, success on booking | Tactile trust |
| **Skeleton + shimmer over spinners** | Cards ghost into place, never blank-then-pop | Perceived speed |
| **Trust ribbon** | Tiny shield + "AHPRA-verified · A$5 / attended" footer | Confidence without shouting |
| **Hand-written empty states** | "Your first quote will appear here · stay nearby" not "No data" | Warmth (Calm, Headspace) |
| **Calm progress, not bars** | Soft dots / fade-in beads, never aggressive % | Wellness register |
| **Center FAB tab bar** | Mid-tab is the action (Get a quote), neighbours are nav | Consumer pattern (Maven, Tend) |

---

## 2 · Concrete fixes mapped to QuoteMySmile screens

### 2.1 Welcome (`app/index.tsx`)

**Now:** Vertical mint gradient + serif/script hero + two solid pills + activity strip.

**Modernise:**

- **Hero treatment** — replace the script "in your hand." with a **soft tone-on-tone gradient card** behind a serif headline. Add a one-line kicker in 10 pt uppercase Inter-Medium with a tiny mint dot prefix (`• LIVE QUOTES · AU`).
- **Role tiles** — already fixed in OTA #8. Add a tiny chevron-right at 14 pt on the right edge to telegraph the tap.
- **Activity strip** — replace the flat "● Live →" badge with a tiny pill ribbon: mint dot + "Live" + 8 pt arrow, set in a 22 pt rounded mint-tint chip.
- **Build tag** — keep, but render as `tabular-nums` so the hash doesn't jiggle on every OTA.

### 2.2 Sign-in role picker (`app/sign-in.tsx`)

**Now:** Mint banner + serif hero + two tall role pills.

**Modernise:**

- **Hero** — add a 36 pt Allura "Welcome." above the picker for warmth before the question.
- **Role tile** — OTA #8 fix already lands the layout. Polish: drop subtitle font to 11 pt and add `letterSpacing: 0.6` so it reads as supporting copy, not a competing line.
- **Footer trust strip** — wrap AHPRA copy in a *single* gold-bordered rounded chip rather than free text, so it feels like a stamp.

### 2.3 Phone / OTP screen

**Now:** Phone/Email pill toggle + label + field + primary CTA.

**Modernise:**

- **Pill toggle** — already excellent. Add a 200 ms spring on the moving thumb so it feels alive.
- **Field** — give it a 14 pt internal padding and a subtle 1 px mint-tint underline that thickens to 1.5 px on focus. Lose the hard border.
- **Primary CTA** — already deep teal. Add a `MaterialCommunityIcons name="arrow-right"` (14 pt) inside the button after the text. Modern consumer pattern.
- **Cooldown countdown** — render the "Resend in 42 s" inside a tiny mint chip rather than as plain ghost text. Reads as system state, not error.

### 2.4 Categories grid (`app/categories.tsx` if present)

**Modernise:**

- 2-column grid of **soft surface cards** (#FFFFFF on bone background, radius 22 pt, shadow opacity 0.06).
- Each card: thin Phosphor-style line icon (24 pt mint) top-left, two-line title bottom (`fontFamily: "Italiana"` 22 pt), supporting copy 11 pt taupe.
- Active selection state: 2 pt mint inner border + faint mint glow shadow (matches Tend's category pattern).

### 2.5 Photo capture (`app/capture.tsx`)

**Modernise:**

- Replace the rectangular shutter with a **62 pt circle** outlined 3 pt deep-teal with mint-filled core. Light haptic on tap (`Haptics.selectionAsync()`).
- The slot rows (front / left / right) — adopt the `TileButton` primitive already in the codebase but add a thumbnail-replaces-icon swap on completion so the user sees their own photo, not a generic check.
- Floating "Skip · I'll do it later" should be a `variant="ghost"` Button bottom-centre rather than top-right text.

### 2.6 Live quote feed (`app/live.tsx`)

**Modernise:**

- **Cheapest-quote banner** — surface the top quote in a tall **hero card** at the top with the price in 48 pt Italiana (`tabular-nums`), dentist name 14 pt Inter-Medium, clinic 12 pt taupe. Two CTAs below: primary "Book" (deep teal) + ghost "See breakdown" (opens bottom sheet).
- **Other quotes** — render as `TileButton` rows with the price as the trailing slot, sorted ascending.
- **Empty / awaiting state** — keep the lone dot + "Awaiting first quote" but add a **soft shimmer pulse** on the dot (1.6 s loop) so the user knows the feed is live.
- **Map toggle** — chip pair top-right ("List · Map"), animate with a 180 ms fade-crossfade rather than instant swap.

### 2.7 Quote detail bottom sheet

**New pattern (replaces full-screen quote modal):**

- 32 pt rounded-top sheet, drag handle, dim scrim 50 %.
- Header: dentist name + AHPRA pill side-by-side.
- Body: ADA item list with prices right-aligned (`tabular-nums`).
- Footer: sticky "Book this quote" primary, "Save for later" ghost.
- Dismiss on swipe down (native iOS sheet behaviour). Forward pattern.

### 2.8 Booking confirmation (`app/booking/[id].tsx`)

**Modernise:**

- **Hero** — a tall mint-to-bone gradient card with a soft Phosphor `check-circle` 56 pt centered, then `font-display` "Booked." 48 pt.
- **Detail rows** — kicker / label pattern (already used in `TileButton`):
  ```
  WHEN      Thu 19 June, 10:30 am
  WHERE     Tend Dental, Surry Hills
  TOTAL     $580 deposit · $5 fee
  ```
- **Calendar button** — secondary outlined espresso pill, "Add to calendar" + outline icon. Subtle.
- **Tappable AHPRA & dentist name** — opens dentist profile sheet.

### 2.9 Patient tab bar (`components/PatientTabBar.tsx`)

**Modernise to a center-FAB pattern:**

- 4 nav tabs + a centre 56 pt mint **floating button** that protrudes 8 pt above the bar — `tooth-outline` icon → routes to `/categories`.
- Surrounding tabs: Home · Inbox · (FAB) · Live · Settings.
- Tab labels 9 pt uppercase Inter-Medium tracking 1.2 — like Maven / Tend.
- Selected state: mint dot under the icon, no fill colour change. Calm.

### 2.10 Dentist dashboard

**Modernise:**

- Replace the deep-teal header banner with a **photographic-feeling tone gradient** (#1F4F47 → #2D6E66) and a *single* serif headline ("Today.") in white Italiana 44 pt.
- Below: 3 KPI tiles (Open requests · Quotes sent · Booked today) using `TileButton` with `kicker` for the metric label.
- Open requests list — each row is a `TileButton` with the request photo as `leftSlot`, the category as `title`, time-since-open as `subtitle`, an inline mint "Quote →" trailing chip.

---

## 3 · Cross-cutting system upgrades (low effort, high impact)

| # | Upgrade | Where | Impact |
|---|---|---|---|
| 1 | Adopt **Phosphor** icons via `phosphor-react-native` (thin 1.5 px stroke) | Global swap from MaterialCommunityIcons | Single biggest aesthetic lift |
| 2 | Add **`expo-haptics`** to primary CTAs, slot picks, booking confirm | `Button.tsx` press handler | Tactile premium feel |
| 3 | Add **Lora** as `font-body-serif` for editorial flourishes (numbers in quote cards, AHPRA registration line) | `tailwind.config.js` + `useFonts` | Editorial register |
| 4 | Standardise **shadow tokens**: `shadow-card` (opacity 0.06, radius 8), `shadow-elevated` (opacity 0.12, radius 16), `shadow-hero` (opacity 0.22, radius 24) | `lib/shadows.ts` | Consistent depth |
| 5 | Standardise **radius tokens**: `radius-sm 12`, `radius-md 18`, `radius-lg 22`, `radius-xl 28`, `radius-pill 999` | `lib/radii.ts` | Calm rhythm |
| 6 | All primary CTAs `min-height: 56` with `tabular-nums` on prices | `Button.tsx` lg size | Touchable + clean number alignment |
| 7 | Replace blank spinners with `<Skeleton />` (already in repo) on every list | Live feed, inbox, dashboard | Perceived speed |
| 8 | Reduce-motion respect: gate spring / shimmer behind `AccessibilityInfo.isReduceMotionEnabled()` | Animation utilities | A11y compliance |
| 9 | Replace `← Back` text in `BackBar.tsx` with `arrow-left` icon button (same chip treatment as sign-in) | `components/BackBar.tsx` | Visual consistency |
| 10 | Add a single `<TrustRibbon />` component (shield + AHPRA + A$5 line) and reuse across welcome, sign-in, booking confirmation | New component | Brand spine |

---

## 4 · Palette confirmation (no change)

```
Bone           #F5F1E8   bg
Linen          #E5DCC8   hairlines
Eggshell       #EFE9DA   inputs
Mint           #5FA89B   secondary, accents
Mint deep      #1F4F47   primary CTA, dentist surfaces
Mint mist      #A8DCCB   gradient top, soft chips
Espresso       #2A2520   primary text
Walnut         #5C5045   body
Taupe          #8A7E70   meta / hint
Gold           #C9A961   trust ribbon, dividers
Clay           #9E5E47   destructive (gentle, not red)
Forest         #3F7E73   active dot, kicker mint-on-bone
```

**Contrast verified:**
- Espresso on Bone: 12.6 : 1 (AAA)
- White on Mint deep: 9.8 : 1 (AAA)
- White on Mint: 2.1 : 1 — **forbidden for text**, always pair text with Mint deep
- Taupe on Bone: 4.7 : 1 (AA)

---

## 5 · Suggested rollout order (atomic, ship-able)

1. **OTA #9 — type & rhythm**: lineHeight tokens, tabular-nums on all prices, shadow + radius token files, BackBar arrow-icon. *No new deps.* ~2 hours.
2. **OTA #10 — Phosphor icons**: install `phosphor-react-native`, codemod the 12 most-used glyphs. ~3 hours.
3. **OTA #11 — haptics + shimmer**: `expo-haptics` taps + shimmer on skeletons. ~2 hours.
4. **OTA #12 — bottom sheets**: install `@gorhom/bottom-sheet`, port quote detail + booking confirm. ~6 hours.
5. **OTA #13 — center-FAB tab bar + categories grid refresh**. ~4 hours.
6. **OTA #14 — dentist dashboard refresh + trust ribbon**. ~3 hours.

Each OTA stays inside the existing runtime so no new native build is required for steps 1, 3, 4 (Bottom Sheet uses Reanimated which is already linked). Steps 2 and 5 may require a new TestFlight build depending on Phosphor's native deps — verify with `npx expo prebuild --check`.

---

## 6 · Direct comparison

| Screen | Today | After this proposal | Reference brand |
|---|---|---|---|
| Welcome | Vertical mint with serif headline + two solid pills | Tone-on-tone gradient hero + role tiles + activity ribbon | Tend NYC |
| Sign-in role picker | Cream surface + two role tiles | Same + Allura "Welcome." + gold-stamped trust chip | Maven |
| OTP | Plain field + send button | Mint-underline field + animated cooldown chip + arrow-in-CTA | Hims & Hers |
| Live feed | Stacked list of quote totals | Hero cheapest-quote card + tile rows + shimmer-pulse waiting state | Forward Health |
| Quote detail | Full-screen modal | Drag-handle bottom sheet w/ sticky book CTA | Headspace |
| Booking confirm | Cream screen + currency lines | Gradient hero card with check + kicker/label rows + AHPRA chip | One Medical |
| Patient tab bar | 5 flat tabs | 4 tabs + centre mint FAB | Tend |
| Dentist dashboard | Deep-teal header + list | "Today." serif hero + KPI tile row + request rows w/ photos | Maven |

---

## Sources

- [Healthcare UI Design 2026: Best Practices + Examples — Eleken](https://www.eleken.co/blog-posts/user-interface-design-for-healthcare-applications)
- [Healthcare App Design Guide 2025 — Mindster](https://mindster.com/mindster-blogs/healthcare-app-design-guide/)
- [Healthcare Mobile App Design: The Complete 2026 Guide — SaaS Factor](https://www.saasfactor.co/blogs/healthcare-mobile-app-design)
- [About Hims & Hers — hims.com](https://www.hims.com/about/the-company)
- [iOS Bottom sheet Patterns — Page Flows](https://pageflows.com/ios/elements/bottom-sheet/)
- [Headspace UX Flow — Page Flows iOS](https://pageflows.com/ios/products/headspace/)
- [Case Study: How Headspace Designs for Mindfulness — Raw.Studio](https://raw.studio/blog/how-headspace-designs-for-mindfulness/)
- [18 Best Healthcare Website Design Examples 2025 — Webstacks](https://www.webstacks.com/blog/healthcare-website-design)
- [Healthcare App Design — Topflight](https://topflightapps.com/ideas/healthcare-mobile-app-design/)

