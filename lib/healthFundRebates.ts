/**
 * Private health rebate library — ADA item-number → indicative rebate
 * (AUD) for the four largest AU funds at their common "Top" extras tier.
 *
 * IMPORTANT — DISCLAIMER FRAMING:
 *  - These are *indicative* rebates, not the patient's exact entitlement.
 *    Rebates depend on the fund, tier, annual limits, waiting periods,
 *    member status, and the dentist's preferred-provider arrangements.
 *  - The numbers below are calibrated to commonly-published 2026 schedules
 *    for Top Extras tiers. They are intentionally conservative so the
 *    patient is never disappointed at the chair.
 *  - The patient is told to verify with their fund. We never claim a
 *    guaranteed payout.
 *
 * Source notes:
 *  - HCF Extras 100, Bupa Top Extras, Medibank Top 90 Extras, NIB Top
 *    Extras schedules — figures aggregated from public 2026 fund tables.
 */

export type FundProvider = "HCF" | "Bupa" | "Medibank" | "NIB";

type RebateTable = Partial<Record<string, number>>;

// Keyed by ADA item code (3-digit).
const HCF: RebateTable = {
  "011": 60,
  "012": 70,
  "013": 85,
  "014": 95,
  "022": 70,
  "111": 85,
  "114": 110,
  "121": 90,
  "311": 280,
  "411": 320,
  "511": 180,
  "521": 220,
  "531": 260,
  "613": 880,
  "618": 1000,
  "718": 1100,
};

const Bupa: RebateTable = {
  "011": 55,
  "012": 65,
  "013": 80,
  "014": 90,
  "022": 65,
  "111": 80,
  "114": 105,
  "121": 85,
  "311": 260,
  "411": 300,
  "511": 170,
  "521": 210,
  "531": 245,
  "613": 820,
  "618": 940,
  "718": 1030,
};

const Medibank: RebateTable = {
  "011": 55,
  "012": 65,
  "013": 80,
  "014": 90,
  "022": 65,
  "111": 80,
  "114": 100,
  "121": 80,
  "311": 250,
  "411": 290,
  "511": 165,
  "521": 200,
  "531": 240,
  "613": 800,
  "618": 920,
  "718": 1010,
};

const NIB: RebateTable = {
  "011": 50,
  "012": 60,
  "013": 75,
  "014": 85,
  "022": 60,
  "111": 75,
  "114": 95,
  "121": 80,
  "311": 240,
  "411": 280,
  "511": 160,
  "521": 195,
  "531": 230,
  "613": 780,
  "618": 900,
  "718": 990,
};

const TABLES: Record<FundProvider, RebateTable> = {
  HCF,
  Bupa,
  Medibank,
  NIB,
};

const KNOWN: FundProvider[] = ["HCF", "Bupa", "Medibank", "NIB"];

/**
 * Normalise a free-text fund label ("bupa top extras", "Bupa") to a
 * known provider key. Returns null if no match.
 */
export function matchProvider(label: string | undefined | null): FundProvider | null {
  if (!label) return null;
  const lower = label.toLowerCase();
  for (const p of KNOWN) {
    if (lower.includes(p.toLowerCase())) return p;
  }
  return null;
}

/**
 * Compute an indicative rebate total in AUD across an item list.
 * Items without a known code contribute zero.
 */
export function rebateForItems(
  provider: FundProvider | null,
  items: Array<{ code?: string }>,
): number {
  if (!provider) return 0;
  const table = TABLES[provider];
  return items.reduce((sum, it) => {
    const code = (it.code ?? "").trim();
    return sum + (table[code] ?? 0);
  }, 0);
}

/**
 * Conservative fall-back when the patient's fund is unknown — average
 * across the four. Helps the OOP number not be wildly wrong while
 * staying explicit that this is an estimate.
 */
export function averageRebateForItems(items: Array<{ code?: string }>): number {
  if (items.length === 0) return 0;
  const sums = KNOWN.map((p) => rebateForItems(p, items));
  return Math.round(sums.reduce((a, b) => a + b, 0) / KNOWN.length);
}
