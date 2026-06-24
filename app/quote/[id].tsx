import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Disclaimer } from "@/components/Disclaimer";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { FinanceBadges } from "@/components/FinanceBadges";
import { ExpiryCountdown } from "@/components/ExpiryCountdown";
import { getQuote as fetchQuote, reportQuote } from "@/lib/services/quotes";
import { getQuote as getSampleQuote } from "@/lib/sampleQuotes";
import type { AdaItem } from "@/lib/types";
import {
  matchProvider,
  rebateForItems,
  averageRebateForItems,
  type FundProvider,
} from "@/lib/healthFundRebates";

const REPORT_REASONS = [
  "Misleading or fraudulent quote",
  "Inappropriate / offensive language",
  "Suspect not a real dentist",
  "Spam or unrelated content",
  "Something else",
] as const;

type ViewQuote = {
  id: string;
  total: number;
  previousTotal?: number | null;
  items: AdaItem[];
  availability: string[];
  note?: string | null;
  ahpraNo: string;
  ahpraRegType: string;
  dentistName: string;
  clinicName: string;
  clinicAddress?: string;
  emergencyPremiumPct?: number;
  // Captured from the patient's intake so we can compute a tailored
  // private-health rebate without re-prompting them on this screen.
  fundLabel?: string | null;
  fundLevel?: string | null;
  // When the original request stops accepting quotes / locks. Drives
  // the discrete countdown above the Book consult button.
  requestClosesAt?: string | null;
};

export default function QuoteDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [q, setQ] = useState<ViewQuote | null>(null);

  useEffect(() => {
    if (!id) return;
    // 10s hard timeout so a hanging fetch doesn't leave the user on a
    // blank "Quote · loading" screen indefinitely. The catch branch
    // falls back to sample data so they always see something.
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Quote fetch timed out")), 10_000),
    );
    Promise.race([fetchQuote(id), timeout])
      .then((row: any) => {
        if (!row) {
          // Fall back to demo data when not signed in / no row found
          const sample = getSampleQuote(id) ?? getSampleQuote("q-1")!;
          setQ({
            id: sample.id,
            total: sample.total,
            previousTotal: sample.previousTotal ?? null,
            items: sample.items ?? [],
            availability: [sample.availability],
            note: sample.note ?? null,
            ahpraNo: sample.ahpraNo,
            ahpraRegType: "General",
            dentistName: sample.dentistName,
            clinicName: sample.clinicName,
          });
          return;
        }
        const fund = row.requests?.health_fund_json as
          | { name?: string; level?: string }
          | null
          | undefined;
        const requestClosesAt = (row.requests?.closes_at as string | null) ?? null;
        setQ({
          id: row.id,
          total: row.total,
          previousTotal: row.previous_total,
          items: (row.items_json as AdaItem[]) ?? [],
          availability: (row.availability_slots as string[]) ?? [],
          note: row.note,
          ahpraNo: row.ahpra_no,
          ahpraRegType: row.ahpra_reg_type,
          dentistName: row.dentist_name_at_quote,
          clinicName: row.clinics?.name ?? "Clinic",
          clinicAddress: row.clinics?.address ?? undefined,
          emergencyPremiumPct: row.emergency_premium_pct ?? 0,
          fundLabel: fund?.name ?? null,
          fundLevel: fund?.level ?? null,
          requestClosesAt,
        });
      })
      .catch(() => {
        const sample = getSampleQuote(id) ?? getSampleQuote("q-1")!;
        setQ({
          id: sample.id,
          total: sample.total,
          previousTotal: sample.previousTotal ?? null,
          items: sample.items ?? [],
          availability: [sample.availability],
          note: sample.note ?? null,
          ahpraNo: sample.ahpraNo,
          ahpraRegType: "General",
          dentistName: sample.dentistName,
          clinicName: sample.clinicName,
        });
      });
  }, [id]);

  if (!q) {
    return (
      <SafeAreaView className="flex-1 bg-bone">
        <BackBar title="Quote · loading" />
      </SafeAreaView>
    );
  }

  // Pick the patient's fund if we can recognise the label; otherwise
  // fall back to a four-fund average so the OOP figure is still
  // grounded. Every dollar shown here is INDICATIVE — the disclaimer
  // copy above and the rebate library both repeat that.
  const matched: FundProvider | null = matchProvider(q.fundLabel);
  const rebate = matched
    ? rebateForItems(matched, q.items)
    : averageRebateForItems(q.items);
  const fundDisplayLabel = matched
    ? `${matched}${q.fundLevel ? ` · ${q.fundLevel}` : ""}`
    : "Indicative · avg. of major funds";
  const oop = Math.max(0, q.total - rebate);

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Quote · Breakdown" />
      <ScrollView>
        <View className="px-8 pt-12 pb-6 items-center">
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-2">
            {q.clinicName}
          </Text>
          <Text className="font-display text-2xl text-walnut mb-3">{q.dentistName}</Text>
          <VerifiedBadge ahpraNo={q.ahpraNo} size="md" />

          <Text
            className="font-display text-gold leading-none mt-10"
            // Scale down for >4-digit totals so $12,450 doesn't overflow
            // the screen on small phones. 88 → 64 → 52 → 44.
            style={{
              fontSize:
                q.total >= 100000
                  ? 44
                  : q.total >= 10000
                    ? 52
                    : q.total >= 1000
                      ? 72
                      : 88,
            }}
            adjustsFontSizeToFit
            numberOfLines={1}
            allowFontScaling={false}
          >
            ${q.total.toLocaleString("en-AU")}
          </Text>
          <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans mt-2 mb-2">
            Total · indicative
          </Text>
          {q.previousTotal ? (
            <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
              Requoted from ${q.previousTotal}
            </Text>
          ) : null}
          {q.emergencyPremiumPct && q.emergencyPremiumPct > 0 ? (
            <View className="mt-3 px-4 py-2 border border-clay/40 bg-clay/5">
              <Text className="text-[10px] tracking-cap uppercase text-clay font-sans">
                Includes {q.emergencyPremiumPct}% emergency uplift
              </Text>
            </View>
          ) : null}
        </View>

        <View className="px-8 mb-10">
          <Disclaimer variant="medium" />
        </View>

        {q.items.length > 0 ? (
          <View className="px-8 mb-12">
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
              Itemised · ADA codes
            </Text>
            {q.items.map((it) => (
              <View
                key={it.code}
                className="flex-row items-center justify-between py-4 border-b border-linen"
              >
                <View className="flex-1">
                  <Text className="font-display text-sm text-taupe">{it.code}</Text>
                  <Text className="font-sans text-base text-espresso">{it.label}</Text>
                </View>
                <Text className="font-display text-xl text-espresso">${it.amount}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View className="px-8 mb-12">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            Health fund estimate
          </Text>
          <View className="flex-row items-center justify-between py-3">
            <Text className="font-sans text-base text-walnut">{fundDisplayLabel}</Text>
            <Text className="font-display text-xl text-walnut">-${rebate}</Text>
          </View>
          <View className="flex-row items-center justify-between py-3 border-t border-linen">
            <Text className="font-sans text-base text-espresso">Estimated out-of-pocket</Text>
            <Text className="font-display text-2xl text-gold">${oop}</Text>
          </View>
          <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-3">
            Verify exact rebate with your fund — depends on tier,
            annual limits and waiting periods.
          </Text>
        </View>

        {/* Finance options — only render once the total clears the
            BNPL-meaningful threshold so we don't gimmick a $25 clean. */}
        <FinanceBadges total={q.total} />

        {q.availability.length > 0 ? (
          <View className="px-8 mb-12">
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
              Availability
            </Text>
            {q.availability.map((iso) => (
              <Text key={iso} className="font-sans text-base text-espresso mb-2">
                {new Date(iso).toLocaleString("en-AU", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
            ))}
          </View>
        ) : null}

        {q.note ? (
          <View className="px-8 mb-12">
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
              Note from {q.dentistName.split(" ").slice(-1)}
            </Text>
            <Text className="font-sans text-base text-walnut leading-relaxed italic">
              "{q.note}"
            </Text>
          </View>
        ) : null}

        <View className="px-8 pb-6 items-center">
          {q.requestClosesAt ? (
            <View className="mb-4">
              <ExpiryCountdown
                closesAt={q.requestClosesAt}
                size="md"
                prefix="Window closes in"
                closedLabel="Quote window closed · book direct"
              />
            </View>
          ) : null}
          <Button
            variant="primary"
            size="lg"
            onPress={() => router.push({ pathname: "/book", params: { id: q.id } })}
          >
            Book consult
          </Button>
        </View>

        {/* Apple 1.2 — UGC report flow. Quotes are dentist-authored text;
            the App Store requires a 1-tap path for patients to flag
            objectionable / misleading content. */}
        <View className="px-8 pb-24 items-center">
          <Pressable
            onPress={() => {
              Alert.alert("Report this quote", "Why are you reporting it?", [
                ...REPORT_REASONS.map((reason) => ({
                  text: reason,
                  onPress: async () => {
                    try {
                      const r = await reportQuote({ quoteId: q.id, reason });
                      Alert.alert(
                        r.alreadyReported ? "Already reported" : "Thanks — report received",
                        r.alreadyReported
                          ? "You've already reported this quote. We'll review it within 24 hours."
                          : "Our team reviews reports within 24 hours. We may contact you for context.",
                      );
                    } catch (e) {
                      Alert.alert(
                        "Couldn't send report",
                        e instanceof Error ? e.message : "Try again, or email support@quotemysmile.com.au",
                      );
                    }
                  },
                })),
                { text: "Cancel", style: "cancel" as const },
              ]);
            }}
            hitSlop={10}
          >
            <Text className="text-[10px] tracking-cap uppercase text-clay font-sans">
              Report this quote
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
