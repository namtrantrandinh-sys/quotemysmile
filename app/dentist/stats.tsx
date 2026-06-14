import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { loadDentistStats, type DentistStats } from "@/lib/services/stats";

export default function StatsScreen() {
  const [stats, setStats] = useState<DentistStats | null>(null);
  useEffect(() => {
    loadDentistStats().then(setStats).catch(() => {});
  }, []);
  const s = stats;
  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Stats · last 30 days" />
      <ScrollView>
        <View className="px-8 pt-12 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Camberwell Dental
          </Text>
          <Text className="font-display text-4xl text-espresso text-center leading-[1.05]">
            Your last thirty days.
          </Text>
        </View>

        <View className="px-8 mb-12 border-y border-linen py-8">
          <Row label="Requests received" value={String(s?.requestsReceived ?? 0)} />
          <Row label="Quotes sent" value={String(s?.quotesSent ?? 0)} />
          <Row label="Requotes used" value={String(s?.requotesUsed ?? 0)} />
          <Row label="Consults won" value={String(s?.consultsWon ?? 0)} last />
        </View>

        <View className="px-8 mb-12">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            Win mix
          </Text>
          <Bar label="By price" pct={43} />
          <Bar label="By availability" pct={28} />
          <Bar label="By rating" pct={29} />
        </View>

        <View className="px-8 mb-12 border-t border-linen pt-8">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            Response time
          </Text>
          <Text className="font-display text-5xl text-gold mb-1">3m 42s</Text>
          <Text className="text-[11px] tracking-cap uppercase text-forest font-sans">
            Tier 1 priority
          </Text>
        </View>

        <View className="px-8 mb-12 border-t border-linen pt-8">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            Average ticket
          </Text>
          <Text className="font-display text-5xl text-gold mb-2">
            ${s?.avgTicket ?? "—"}
          </Text>
        </View>

        <View className="px-8 pb-24 border-t border-linen pt-8">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            Suggested actions
          </Text>
          <Text className="text-sm text-walnut font-sans leading-relaxed mb-3">
            · Your composite-filling line is 18% above market — consider a
            template adjustment.
          </Text>
          <Text className="text-sm text-walnut font-sans leading-relaxed">
            · Enable After-hours mode for emergency requests.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, suffix, last }: { label: string; value: string; suffix?: string; last?: boolean }) {
  return (
    <View className={`flex-row items-center justify-between py-3 ${last ? "" : "border-b border-linen"}`}>
      <Text className="font-sans text-sm text-walnut">{label}</Text>
      <View className="flex-row items-baseline gap-3">
        <Text className="font-display text-2xl text-espresso">{value}</Text>
        {suffix ? (
          <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">{suffix}</Text>
        ) : null}
      </View>
    </View>
  );
}

function Bar({ label, pct }: { label: string; pct: number }) {
  return (
    <View className="mb-6">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-sm text-walnut font-sans">{label}</Text>
        <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">{pct}%</Text>
      </View>
      <View className="h-1.5 bg-linen rounded-full overflow-hidden">
        <View className="h-1.5 bg-gold" style={{ width: `${pct}%` }} />
      </View>
    </View>
  );
}
