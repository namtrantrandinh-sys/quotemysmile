import type { Quote } from "./types";

// Patient pin = Camberwell intersection of Burke Rd & Riversdale Rd
export const PATIENT_PIN = { lat: -37.831, lng: 145.058 };

export const SAMPLE_QUOTES: Quote[] = [
  {
    id: "q-1",
    clinicName: "Camberwell Dental",
    dentistName: "Dr Sarah Chen",
    suburb: "Camberwell, VIC",
    distanceKm: 2.1,
    rating: 4.9,
    reviewCount: 148,
    availability: "Tomorrow 9:00 am",
    total: 385,
    previousTotal: 410,
    ahpraNo: "DEN0001234567",
    isFinal: true,
    lat: -37.829,
    lng: 145.073,
    items: [
      { code: "011", label: "Comprehensive exam", amount: 75 },
      { code: "022", label: "X-ray, intraoral", amount: 45 },
      { code: "111", label: "Scale + clean", amount: 120 },
      { code: "531", label: "Composite filling", amount: 145 },
    ],
    note: "Happy to smooth the sharp edge same-day if needed.",
  },
  {
    id: "q-2",
    clinicName: "Bright Dental",
    dentistName: "Dr Marcus Wei",
    suburb: "Kew, VIC",
    distanceKm: 4.8,
    rating: 4.8,
    reviewCount: 203,
    availability: "Today 4:00 pm",
    total: 349,
    ahpraNo: "DEN0007654321",
    isLowest: true,
    lat: -37.806,
    lng: 145.038,
    items: [
      { code: "011", label: "Comprehensive exam", amount: 65 },
      { code: "022", label: "X-ray, intraoral", amount: 40 },
      { code: "111", label: "Scale + clean", amount: 109 },
      { code: "531", label: "Composite filling", amount: 135 },
    ],
  },
  {
    id: "q-3",
    clinicName: "Smile Co",
    dentistName: "Dr Aisha Patel",
    suburb: "Hawthorn, VIC",
    distanceKm: 3.4,
    rating: 4.7,
    reviewCount: 92,
    availability: "Thursday 2:00 pm",
    total: 420,
    ahpraNo: "DEN0002345678",
    lat: -37.822,
    lng: 145.035,
    items: [
      { code: "011", label: "Comprehensive exam", amount: 85 },
      { code: "022", label: "X-ray, intraoral", amount: 50 },
      { code: "111", label: "Scale + clean", amount: 135 },
      { code: "531", label: "Composite filling", amount: 150 },
    ],
  },
];

export function getQuote(id: string): Quote | undefined {
  return SAMPLE_QUOTES.find((q) => q.id === id);
}
