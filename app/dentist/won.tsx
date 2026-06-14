import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Wordmark } from "@/components/Wordmark";
import { listClinicBookings } from "@/lib/services/bookings";

type BookingRow = {
  id: string;
  slot: string;
  status: string;
  quotes?: { total: number; dentist_name_at_quote: string } | null;
};

export default function DentistWonScreen() {
  const router = useRouter();
  const [latest, setLatest] = useState<BookingRow | null>(null);
  useEffect(() => {
    listClinicBookings()
      .then((d) => {
        const rows = d as unknown as BookingRow[];
        const upcoming = rows.find((r) => new Date(r.slot) > new Date());
        setLatest(upcoming ?? rows[0] ?? null);
      })
      .catch(() => {});
  }, []);

  const slotLabel = latest
    ? new Date(latest.slot).toLocaleString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : "Tomorrow at 9:00 am";
  const total = latest?.quotes?.total ?? 359;

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-8 py-20">
          <View className="h-2 w-2 rounded-full bg-gold mb-12" />
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            Won
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-10">
            Sarah booked you.
          </Text>

          <View className="border-y border-linen py-10 w-full max-w-md items-center mb-10">
            <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-2">
              {slotLabel}
            </Text>
            <Text className="font-display text-3xl text-gold">${total}</Text>
            <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mt-2">
              Final · subject to clinical exam
            </Text>
          </View>

          <View className="w-full max-w-md mb-12">
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4 text-center">
              Patient contact released
            </Text>
            <View className="border-t border-linen pt-4 items-center gap-2">
              <Text className="font-sans text-base text-espresso">Sarah K</Text>
              <Text className="font-sans text-sm text-walnut">0412 491 891</Text>
              <Text className="font-sans text-sm text-walnut">sarah@email.com</Text>
            </View>
          </View>

          <View className="w-full max-w-md mb-12 border-t border-linen pt-8">
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4 text-center">
              Why you won
            </Text>
            <Text className="text-sm text-walnut font-sans text-center leading-relaxed">
              Patient sorted by · Best match
              {"\n"}Your strengths · Closest distance, same-day availability
            </Text>
          </View>

          <View className="gap-3 items-center">
            <Button variant="primary" size="lg">
              Send confirmation
            </Button>
            <Button variant="secondary" size="md">
              Add to Cliniko
            </Button>
            <Button variant="ghost" size="md" onPress={() => router.replace("/dentist")}>
              Back to dashboard
            </Button>
          </View>
        </View>
        <View className="px-8 py-10 items-center">
          <Wordmark size="sm" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
