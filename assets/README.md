# QuoteMySmile — assets

Vector sources live in `assets/source/`. The PNG outputs are produced by the
script below and committed at the paths the Expo plugins expect.

## Outputs the app.json + plugins reference

| Path                                | Size           | Source                          |
| ----------------------------------- | -------------- | ------------------------------- |
| `assets/icon.png`                   | 1024 × 1024    | `source/icon.svg`               |
| `assets/adaptive-icon.png`          | 1024 × 1024    | `source/adaptive-icon-fg.svg`   |
| `assets/splash.png`                 | 2048 × 2048    | `source/splash.svg`             |
| `assets/notification-icon.png`      |   96 ×   96    | `source/notification-icon.svg`  |

## One-shot generation

The SVGs reference Google Fonts via `@import`, so any modern SVG rasteriser
that respects CSS imports will render them faithfully. The easiest path is
`sharp` via Node.

```bash
# from repo root
npx -y svgexport assets/source/icon.svg              assets/icon.png            1024:1024
npx -y svgexport assets/source/adaptive-icon-fg.svg  assets/adaptive-icon.png   1024:1024
npx -y svgexport assets/source/splash.svg            assets/splash.png          2048:2048
npx -y svgexport assets/source/notification-icon.svg assets/notification-icon.png 96:96
```

If your environment is offline (no Google Fonts), install Italiana + Allura
locally first, then convert with `rsvg-convert` (which honours installed
fonts):

```bash
brew install librsvg
rsvg-convert -w 1024 -h 1024 assets/source/icon.svg \
  -o assets/icon.png
```

## App Store screenshot starter set

For TestFlight + the live submission, you need at minimum **5 screenshots**
per device class. The fastest path:

1. Run the dev build on a simulator with the `0015_seed_demo_clinics`
   migration applied — the live feed shows 6 dentists pinned around
   Camberwell, so the map view looks alive.
2. Capture:
   - Splash (`/`)
   - Mouth scan / camera (`/capture`)
   - Live quotes list (`/live`)
   - Quote detail (`/quote/[id]`)
   - Booking confirmation (`/booked`)
3. Drop them into App Store Connect → Media Manager.

## Brand notes

- **Italiana** for QUOTE + SMILE (high-contrast editorial serif)
- **Allura** for "my" (signature script, slight rotation, gold #C9A961)
- Background **bone** #F5F1E8
- Body **walnut** #4D423A
- Espresso headings #2A2520

These tokens live in `tailwind.config.js`. Do not change without team sign-off.
