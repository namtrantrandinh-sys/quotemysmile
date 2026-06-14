/**
 * QuoteMySmile — AHPRA-compliant copy library.
 *
 * Every public-facing string that touches dentist quoting lives here.
 * Reviewed by healthcare counsel before changes.
 *
 * Rules baked in:
 *  - No "auction" / "bid" / "lowest wins" framing
 *  - No outcome claims, no testimonials, no comparative claims
 *  - Every quote is "indicative · subject to clinical exam"
 *  - Dentist is the responsible practitioner, named on every quote
 *  - Photo quality drives accuracy — surfaced to both sides
 */

export const DISCLAIMER = {
  short: "Indicative · based on photos",
  medium:
    "This quote is indicative, based on the photos and information you provided. The clearer the photo, the more accurate the quote. Final fees and treatment are the responsibility of the quoting dentist and confirmed at your clinical examination.",
  long: `About QuoteMySmile quotes

Every quote on QuoteMySmile is an indicative, photo-based assessment by a registered Australian dentist. The accuracy of any quote depends directly on the quality of the photos and information you provide — clearer, well-lit photos taken as guided produce more accurate quotes.

Each dentist is solely responsible for their own quotes and professional opinions. QuoteMySmile does not provide clinical advice and is not a party to the dentist–patient relationship.

Final treatment, fees, and clinical decisions are confirmed at your in-person examination with the dentist you choose.`,
};

export const DENTIST_ACKS = {
  responsibility:
    "I confirm this quote is based on patient photos only and I accept full professional responsibility for it.",
  photoBased:
    "I understand quotes are based on patient photos and are indicative until clinical examination.",
  noClaims:
    "I will not make claims that breach AHPRA advertising guidelines — no testimonials, guarantees, or outcome promises.",
  pii: "I hold current Professional Indemnity Insurance covering my use of this platform.",
  tos: "I have read and agree to the Dentist Terms of Service and AHPRA Compliance Addendum.",
};

export const PATIENT_ACKS = {
  photoQuality:
    "I understand the accuracy of any quote depends on the quality of the photos I provided.",
  indicativeAtBooking:
    "I understand the quote is indicative until my clinical examination confirms the final fee.",
};

export const PLATFORM_LIABILITY = `QuoteMySmile is a technology platform that facilitates communication between patients and registered Australian dental practitioners. We do not provide dental, medical, or clinical advice. We do not employ or supervise dentists who use the platform. Each dentist is solely responsible for the quotes, opinions, and any treatment they provide.`;

export const GPS_PRIVACY = {
  patient: [
    "To find dentists nearby",
    "Never tracked in the background",
    "Never sold to third parties",
    "Deleted 30 days after each request",
  ],
  dentist: [
    "To confirm you're at the clinic when active",
    "Never tracked in the background",
    "Never sold to third parties",
    "Required while live to receive requests",
  ],
};

/** Words the dentist note filter soft-warns on. */
export const NOTE_BLOCKED_TERMS = [
  // Outcome / guarantee
  "guarantee",
  "guaranteed",
  "promise",
  "promised",
  "best result",
  "best smile",
  "perfect smile",
  "painless",
  "no pain",
  "100%",
  "lifetime",
  "forever",
  // Comparative / testimonial
  "best in",
  "leading",
  "top-rated",
  "no.1",
  "voted",
  // Whitening-specific
  "hollywood smile",
  "celeb smile",
  "snow white",
  "ultra-white",
  "blinding white",
  "permanent whitening",
  "safe for everyone",
];

/** Safe phrasing dentists are encouraged to use instead. */
export const NOTE_SAFE_PHRASES = [
  "Results vary",
  "Depends on your starting shade",
  "Realistic goal based on your enamel",
  "Subject to clinical examination",
  "Available same-day",
  "Bulk-billing for eligible patients",
];

export const REQUOTE_NOTICE =
  "You may requote once. After your requote your quote is final for this window and cannot be changed.";

export const CONSULT_FEE_LINE = "Consult fee · Free for QuoteMySmile bookings.";
