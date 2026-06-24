# App Review Notes — QuoteMySmile

Paste the **Notes for Apple Review** section into App Store Connect → App
Information → App Review Information → Notes. Demo credentials go in the
**Sign-In Information** block immediately below.

---

## Sign-In Information (App Store Connect — separate fields)

- **Email**: review@quotemysmile.com.au
- **Password / OTP**: Tap **Email** tab on the sign-in screen and enter the
  email above. The one-time code is delivered to that inbox via Supabase's
  email-OTP path (Twilio SMS is intentionally bypassed for review — see
  notes below).

If the inbox is unavailable for any reason, please use the static
6-digit code: **123456**. This bypass is only active for
`review@quotemysmile.com.au` and is disabled for every other user.

---

## Notes for Apple Review

### What QuoteMySmile is

QuoteMySmile is an Australian marketplace that lets patients photograph a
dental concern and receive **indicative quotes** from AHPRA-registered
dentists within a chosen GPS radius. Every quote is signed by a registered
practitioner; we display the AHPRA number on every quote and link to the
public AHPRA register. The clinical exam at the chosen clinic confirms the
final treatment plan — quotes are not a clinical diagnosis.

### Business model (Guideline 2.1b — In-App Purchase)

QuoteMySmile **does not unlock any digital content, functionality, or
service inside the app**. Patient sign-up, photo submission, receiving
quotes, choosing a dentist and messaging the clinic are all free.

The only monetary flow is an **A$5 platform fee** charged **at the time of
booking a real-world dental appointment**, processed by Stripe. This fee
covers the physical, real-world dental consultation booked through the
app — exactly the case Apple permits for **physical services** outside IAP
under Guideline 3.1.3(e). No subscription, no consumable, no digital good.

Dentists do not pay for the app. Dentists registering on the app pay an
optional listing fee to their clinic that is settled off-platform under
their existing business arrangement.

### Permissions (Guideline 5.1.1)

- **Camera & microphone** — only used when the patient taps the camera on
  the photo-capture step. Microphone is engaged only if the user explicitly
  taps to record a short video clip instead of a still photo. Both are
  off-screen no-ops otherwise.
- **Location (When In Use)** — used to match the patient with AHPRA
  dentists within their chosen radius. No background location, no
  third-party sharing, never sold.
- **Photo library (read)** — used only when the patient taps **Choose from
  library** on the photo step.
- **Photo library (add)** — used only when the patient taps **Save** on a
  quote to keep a copy.
- **Notifications** — sent only when a new quote arrives on the patient's
  open request, or a booking status changes.

### Health & Medical (Apple 2026 Health/Medical app rule — March 2026)

QuoteMySmile is **not** a Health, Fitness or Medical app. We have selected
the following App Store Connect categorisations to reflect that:

- **Primary category**: Business
- **Secondary category**: Lifestyle
- **Age Rating questionnaire — "Medical / Treatment Information"**:
  *Infrequent / Mild* (the dentist-authored quote text occasionally
  references treatment items in passing, but the app itself surfaces no
  medical, diagnostic, treatment-recommendation or dosage content).

The app does **not** diagnose, treat, prescribe, monitor a condition or
perform any clinical function. It is an **introduction & quotation
marketplace** for patient-initiated dental consultations. Disclaimers are
shown on every quote screen ("indicative — clinical exam confirms"), in
onboarding, and in the in-app legal pages (Settings → Privacy / Terms).

As an introduction marketplace it does **not** meet the SaMD (Software as
a Medical Device) thresholds under the TGA Medical Devices Regulations
2002, the FDA's Mobile Medical Applications guidance, or Apple's March
2026 regulated-medical-device requirement for Health/Medical-categorised
apps. No medical-device registration applies or has been sought.

### User-Generated Content (Guideline 1.2)

Quotes contain free-text notes authored by dentists. We provide:

1. **Report this quote** button at the bottom of every quote detail screen.
2. **Block / cancel** path on every booking and message thread.
3. Server-side moderation pipeline: reports land in `quote_reports`
   (Supabase) and are reviewed within 24 hours by our compliance team.
4. EULA published at `/legal/terms` (also linked from sign-in & onboarding)
   explicitly forbids objectionable content; offending dentists are
   suspended on first substantiated report.

### Sign In with Apple (Guideline 4.8)

We offer phone-OTP and email-OTP sign-in. Because we use Supabase's
phone-OTP provider — which Apple has historically classified as a
"third-party service" — we also offer **Sign In with Apple** as a peer
option on the sign-in screen.

### Demo data

Some screens (Live Feed, sample quotes) may surface seeded demo data when
no active patient request exists; this is clearly labelled with a small
**"Demo"** pill in the top-right of any affected card.

### Contact

Andrew (founder) — support@quotemysmile.com.au
Phone — see the App Store Connect contact information.
We respond within 4 hours during AEST business hours.
