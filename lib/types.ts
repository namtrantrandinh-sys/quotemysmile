export type CategoryId =
  | "filling-clean"
  | "checkup-clean"
  | "emergency"
  | "cosmetic"
  | "whitening"
  | "crown-veneer"
  | "implant"
  | "wisdom"
  | "ortho"
  | "not-sure";

export type CategoryGroup = "common" | "cosmetic" | "restorative" | "other";

export type Category = {
  id: CategoryId;
  group: CategoryGroup;
  label: string;
  blurb: string;
  symbol: string; // ASCII / unicode glyph
};

export type ShadeStop = "A1" | "A2" | "A3" | "A3.5" | "A4";

export type Urgency = "emergency" | "1h" | "few" | "24h" | "3d";

export const URGENCY_META: Record<
  Urgency,
  { label: string; window: string; closesInMin: number; feeNote: string; tone: "gold" | "clay" }
> = {
  emergency: {
    label: "Emergency · NOW",
    window: "Closes in 15 min",
    closesInMin: 15,
    feeNote:
      "Premium fee. Marked URGENT to dentists — expect quotes 30–50% above standard. Use only for real pain, swelling, broken or knocked-out tooth.",
    tone: "clay",
  },
  "1h": {
    label: "Within 1 hour",
    window: "Closes in 60 min",
    closesInMin: 60,
    feeNote: "Standard fee. Faster dentist response window.",
    tone: "gold",
  },
  few: {
    label: "A few hours",
    window: "Closes in 3 hours",
    closesInMin: 180,
    feeNote: "Standard fee. More dentists usually quote in this window.",
    tone: "gold",
  },
  "24h": {
    label: "Today / 24 hours",
    window: "Closes in 24 hours",
    closesInMin: 60 * 24,
    feeNote: "Standard fee. Highest volume of quotes.",
    tone: "gold",
  },
  "3d": {
    label: "Within 3 days",
    window: "Closes in 3 days",
    closesInMin: 60 * 24 * 3,
    feeNote: "Standard fee. Best for considered work — implants, ortho.",
    tone: "gold",
  },
};

export type WhiteningIntake = {
  currentShade: ShadeStop;
  goalShade: ShadeStop;
  method: "in-chair" | "tray" | "combo" | "unsure";
  existingWork: Array<
    "front-crowns" | "front-fillings" | "sensitive" | "recent-ortho" | "none"
  >;
  timelineNote?: string;
};

export type StandardIntake = {
  durationBucket: "lt-1wk" | "1-4wks" | "gt-1mo";
  painLevel: number; // 0-5
  triggers: Array<"hot-cold" | "chewing" | "sweet" | "spontaneous" | "pressure" | "night">;
  note?: string;
  healthFund?: { name: string; level: string };
};

export type AdaItem = {
  code: string;
  label: string;
  amount: number;
};

export type Quote = {
  id: string;
  clinicName: string;
  dentistName: string;
  suburb: string;
  distanceKm: number;
  rating: number;
  reviewCount: number;
  availability: string;
  total: number;
  previousTotal?: number;
  items?: AdaItem[];
  note?: string;
  ahpraNo: string;
  isLowest?: boolean;
  isFinal?: boolean;
  justIn?: boolean;
  // Geo — required for map view
  lat?: number;
  lng?: number;
};

export type Dentist = {
  name: string;
  ahpraNo: string;
  clinicName: string;
  abn: string;
  address: string;
  serviceRadiusKm: number;
  categories: CategoryId[];
  piiProvider?: string;
  piiPolicy?: string;
  piiExpiry?: string;
  verified: boolean;
};
