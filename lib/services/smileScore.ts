/**
 * Smile Score — short, opinionated wellness score (0-10) inspired by
 * Toothpic's Smile Score. Designed to be answered in under 30 seconds.
 *
 * The score is a soft engagement hook, NOT a clinical assessment — we
 * are explicit about that in the UI to stay outside TGA/SaMD scope.
 *
 * Each answer has a baseline weight; the final score is rounded to
 * one decimal. Score is persisted on users.smile_score.
 */
import { supabase } from "@/lib/supabase";

export type SmileQuestionId =
  | "last_checkup"
  | "current_pain"
  | "gum_bleeding"
  | "brush_frequency"
  | "floss_frequency"
  | "sugar_or_smoke"
  | "grinding";

export type SmileAnswer = {
  id: SmileQuestionId;
  value: string;
};

export type SmileQuestion = {
  id: SmileQuestionId;
  label: string;
  hint?: string;
  options: Array<{ value: string; label: string; weight: number }>;
};

// 7 risk-factor questions. Weights are non-uniform — pain, gum bleeding,
// and smoking weigh more heavily because they correlate most strongly with
// active disease in the dental literature (ADA AU oral-health guidelines,
// AIHW dental risk factors). Final sum still maxes at 10.0.
//
//   Last check-up        max 1.5  (recency of professional care)
//   Current pain         max 2.0  (proxy for acute issue right now)
//   Gum bleeding         max 1.5  (proxy for gingivitis/periodontitis)
//   Brushing frequency   max 1.0  (baseline hygiene)
//   Flossing             max 1.0  (interdental hygiene)
//   Sugar/smoke/vape     max 2.0  (highest-impact modifiable risk)
//   Grinding/clenching   max 1.0  (occlusal wear / TMJ risk)
//   -----------------------------------------------------
//   Total                max 10.0
export const SMILE_QUESTIONS: SmileQuestion[] = [
  {
    id: "last_checkup",
    label: "When was your last dental check-up?",
    options: [
      { value: "lt6", label: "Less than 6 months ago", weight: 1.5 },
      { value: "6_12", label: "6–12 months ago", weight: 1.2 },
      { value: "1_2y", label: "1–2 years ago", weight: 0.6 },
      { value: "gt2y", label: "More than 2 years", weight: 0.1 },
    ],
  },
  {
    id: "current_pain",
    label: "Any pain or sensitivity right now?",
    options: [
      { value: "none", label: "None", weight: 2.0 },
      { value: "mild", label: "Mild", weight: 1.3 },
      { value: "moderate", label: "Moderate", weight: 0.5 },
      { value: "severe", label: "Severe", weight: 0 },
    ],
  },
  {
    id: "gum_bleeding",
    label: "Do your gums bleed when you brush or floss?",
    options: [
      { value: "never", label: "Never", weight: 1.5 },
      { value: "rarely", label: "Rarely", weight: 1.1 },
      { value: "sometimes", label: "Sometimes", weight: 0.5 },
      { value: "often", label: "Often", weight: 0 },
    ],
  },
  {
    id: "brush_frequency",
    label: "How often do you brush your teeth?",
    options: [
      { value: "twice", label: "Twice a day or more", weight: 1.0 },
      { value: "once", label: "Once a day", weight: 0.6 },
      { value: "few", label: "A few times a week", weight: 0.2 },
      { value: "rare", label: "Rarely", weight: 0 },
    ],
  },
  {
    id: "floss_frequency",
    label: "How often do you floss?",
    options: [
      { value: "daily", label: "Daily", weight: 1.0 },
      { value: "weekly", label: "A few times a week", weight: 0.7 },
      { value: "rarely", label: "Rarely", weight: 0.3 },
      { value: "never", label: "Never", weight: 0 },
    ],
  },
  {
    id: "sugar_or_smoke",
    label: "Smoke, vape, or drink sugary drinks daily?",
    options: [
      { value: "no", label: "No", weight: 2.0 },
      { value: "occ", label: "Occasionally", weight: 1.2 },
      { value: "weekly", label: "Weekly", weight: 0.6 },
      { value: "daily", label: "Daily", weight: 0 },
    ],
  },
  {
    id: "grinding",
    label: "Do you grind or clench your teeth (day or night)?",
    options: [
      { value: "no", label: "No", weight: 1.0 },
      { value: "sometimes", label: "Sometimes", weight: 0.6 },
      { value: "often", label: "Often", weight: 0.2 },
      { value: "unsure", label: "Not sure", weight: 0.5 },
    ],
  },
];

export function computeSmileScore(answers: SmileAnswer[]): number {
  let total = 0;
  for (const a of answers) {
    const q = SMILE_QUESTIONS.find((q) => q.id === a.id);
    const opt = q?.options.find((o) => o.value === a.value);
    if (opt) total += opt.weight;
  }
  return Math.round(total * 10) / 10;
}

/**
 * Score band — descriptive only, NO comparative/percentile claims. We
 * don't have a population dataset, so we don't claim "ahead of most
 * Australians" or similar. Copy describes the user's own answers, not
 * a comparison.
 */
export function smileScoreBand(score: number): {
  band: "great" | "good" | "okay" | "needs_care";
  label: string;
  hint: string;
} {
  if (score >= 8.5)
    return {
      band: "great",
      label: "Healthy habits",
      hint: "Your answers suggest strong daily care — keep it up and stay on your check-up cadence.",
    };
  if (score >= 6.5)
    return {
      band: "good",
      label: "Solid baseline",
      hint: "A few small habit tweaks (or a check-up if it's been a while) could lift this further.",
    };
  if (score >= 4)
    return {
      band: "okay",
      label: "Room to improve",
      hint: "A few of your answers point to risk factors a dentist can help you address.",
    };
  return {
    band: "needs_care",
    label: "Worth a visit",
    hint: "Several answers suggest active risk factors — booking a check-up is the safest next step.",
  };
}

export async function saveSmileScore(input: {
  answers: SmileAnswer[];
  score: number;
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const { error } = await supabase
    .from("users")
    .update({
      smile_score: input.score,
      smile_score_at: new Date().toISOString(),
      smile_score_answers: input.answers,
    })
    .eq("id", user.id);
  if (error) throw error;
}

export async function getMySmileScore(): Promise<{
  score: number | null;
  at: string | null;
}> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { score: null, at: null };
  const { data } = await supabase
    .from("users")
    .select("smile_score, smile_score_at")
    .eq("id", user.id)
    .maybeSingle();
  return {
    score: (data?.smile_score as number | null) ?? null,
    at: (data?.smile_score_at as string | null) ?? null,
  };
}
