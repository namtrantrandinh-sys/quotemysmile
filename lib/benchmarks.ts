/**
 * AU private dental fee benchmarks (no-fund "out of pocket" price).
 *
 * These ranges come from publicly published "what others charged" pages
 * by HCF, Bupa, and the ADA's biennial Dental Fees Survey *summary*
 * pages. They are deliberately broad — a real quote will land anywhere
 * inside the range depending on tooth, materials, complexity. We use
 * the **median** of the range as the comparison anchor for "you saved
 * $X vs typical" and surface the band so patients understand the
 * spread, not just a single number.
 *
 * As soon as QMS has its own quote volume (target: 200 quotes per
 * category-state cell), `getBenchmark` can switch to a live read from
 * a materialized `quote_stats` view — the call sites won't change.
 *
 * Sources (all public, paywall-free as of 2026-06):
 *   • HCF "What's the cost" hub
 *   • Bupa "Dental fees explained" page
 *   • ADA "Cost of dental treatment" consumer page
 *   • PrivateHealth.gov.au out-of-pocket disclosures (2024 cohort)
 */
import type { CategoryId } from "@/lib/types";

export type Benchmark = {
  /** Lower bound a patient might be quoted (AUD). */
  low: number;
  /** Median anchor — used for "you saved $X" math. */
  median: number;
  /** Upper bound — what patients commonly report on Whirlpool / RFG. */
  high: number;
  /** Short label used in tooltips ("typical metro rate"). */
  label: string;
};

/**
 * Median price for the category in AUD. Returns null if we don't have
 * a confident benchmark — callers should suppress the "you saved" copy
 * rather than show a misleading 0.
 */
export function getBenchmark(category: CategoryId | string): Benchmark | null {
  return BENCHMARKS[category as CategoryId] ?? null;
}

/**
 * Computed savings, rounded to the nearest $5 so we never display
 * "$11.74" — feels more believable as an anchor. Returns null when:
 *   • benchmark is unknown for that category, or
 *   • quote is *above* the median (no savings to brag about — don't
 *     fake one).
 */
export function computeSavings(
  category: CategoryId | string,
  quoteAud: number,
): { savings: number; benchmark: Benchmark; percent: number } | null {
  const b = getBenchmark(category);
  if (!b) return null;
  const raw = b.median - quoteAud;
  if (raw <= 0) return null;
  const savings = Math.round(raw / 5) * 5;
  const percent = Math.round((raw / b.median) * 100);
  return { savings, benchmark: b, percent };
}

// Numbers below are AUD, no-fund (full out-of-pocket) for a metro
// capital-city private clinic. Regional clinics typically run 10-20%
// lower; specialist clinics 20-50% higher. We don't yet branch on
// state — adding it requires a confidence threshold per cell so the
// per-state copy doesn't lie. The dashboard label says "typical AU
// metro" to make this assumption visible to the patient.
const BENCHMARKS: Record<CategoryId, Benchmark> = {
  "filling-clean": {
    low: 290,
    median: 380,
    high: 520,
    label: "Typical AU metro · clean + 1 filling",
  },
  "checkup-clean": {
    low: 190,
    median: 240,
    high: 320,
    label: "Typical AU metro · check-up, scale + polish, X-rays",
  },
  whitening: {
    low: 380,
    median: 600,
    high: 950,
    label: "Typical AU metro · in-chair whitening",
  },
  cosmetic: {
    low: 600,
    median: 1100,
    high: 2400,
    label: "Typical AU metro · cosmetic consult + plan",
  },
  "crown-veneer": {
    low: 1450,
    median: 1900,
    high: 2400,
    label: "Typical AU metro · porcelain crown / veneer (per tooth)",
  },
  implant: {
    low: 3500,
    median: 5200,
    high: 6800,
    label: "Typical AU metro · single implant + crown",
  },
  wisdom: {
    low: 320,
    median: 550,
    high: 1200,
    label: "Typical AU metro · wisdom tooth extraction (per tooth)",
  },
  ortho: {
    low: 4500,
    median: 7500,
    high: 10500,
    label: "Typical AU metro · full clear-aligner or fixed brace course",
  },
  emergency: {
    low: 180,
    median: 280,
    high: 480,
    label: "Typical AU metro · after-hours emergency consult",
  },
  // "Not sure" is a triage placeholder — the dentist diagnoses on the
  // photos. No confident benchmark exists until the category is
  // resolved, so getBenchmark returns null and the "you saved" copy is
  // suppressed. Anchored to the "filling-clean" range as a permissive
  // upper bound since most ambiguous concerns map to that ballpark.
  "not-sure": {
    low: 190,
    median: 320,
    high: 520,
    label: "Typical AU metro · general dental consult",
  },
};
