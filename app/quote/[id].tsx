import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Disclaimer } from "@/components/Disclaimer";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { getQuote as fetchQuote } from "@/lib/services/quotes";
import { getQuote as getSampleQuote } from "@/lib/sampleQuotes";
import type { AdaItem } from "@/lib/types";

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
};

const FUND_ESTIMATE = 120;

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

  const oop = q.total - FUND_ESTIMATE;

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
            <Text className="font-sans text-base text-walnut">Bupa Top Extras</Text>
            <Text className="font-display text-xl text-walnut">-${FUND_ESTIMATE}</Text>
          </View>
          <View className="flex-row items-center justify-between py-3 border-t border-linen">
            <Text className="font-sans text-base text-espresso">Estimated out-of-pocket</Text>
            <Text className="font-display text-2xl text-gold">${oop}</Text>
          </View>
        </View>

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

        <View className="px-8 pb-24 items-center">
          <Button
            variant="primary"
            size="lg"
            onPress={() => router.push({ pathname: "/book", params: { id: q.id } })}
          >
            Book consult
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
