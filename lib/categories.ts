import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  {
    id: "filling-clean",
    group: "common",
    label: "Filling + clean",
    blurb: "Composite fillings and a scale + clean.",
    symbol: "I",
  },
  {
    id: "checkup-clean",
    group: "common",
    label: "Check-up + clean",
    blurb: "Routine examination, x-ray, scale + polish.",
    symbol: "II",
  },
  {
    id: "emergency",
    group: "common",
    label: "Emergency",
    blurb: "Pain, swelling, broken or knocked-out tooth.",
    symbol: "III",
  },
  {
    id: "cosmetic",
    group: "cosmetic",
    label: "Cosmetic",
    blurb: "Bonding, contouring, smile design.",
    symbol: "IV",
  },
  {
    id: "whitening",
    group: "cosmetic",
    label: "Whitening",
    blurb: "In-chair or take-home tray whitening.",
    symbol: "V",
  },
  {
    id: "crown-veneer",
    group: "cosmetic",
    label: "Crown / veneer",
    blurb: "Porcelain crown, full or partial veneer.",
    symbol: "VI",
  },
  {
    id: "implant",
    group: "restorative",
    label: "Implant",
    blurb: "Single implant, multiple, or full arch.",
    symbol: "VII",
  },
  {
    id: "wisdom",
    group: "restorative",
    label: "Wisdom tooth",
    blurb: "Removal or assessment of wisdom teeth.",
    symbol: "VIII",
  },
  {
    id: "ortho",
    group: "restorative",
    label: "Ortho / Invisalign",
    blurb: "Braces, clear aligners, or consult.",
    symbol: "IX",
  },
  {
    id: "not-sure",
    group: "other",
    label: "Not sure",
    blurb: "Let the dentist guide you from photos.",
    symbol: "X",
  },
];

export const GROUP_LABEL: Record<string, string> = {
  common: "Most common",
  cosmetic: "Cosmetic",
  restorative: "Restorative",
  other: "Other",
};

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}
