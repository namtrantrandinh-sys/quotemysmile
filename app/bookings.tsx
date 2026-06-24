import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Skeleton } from "@/components/Skeleton";
import { listMyBookings } from "@/lib/services/bookings";
import { PatientTabBar } from "@/components/PatientTabBar";
import { formatAudDollars } from "@/lib/copy";

// Mirrors the booking row shape returned by listMyBookings — kept local
// because the service layer is loose-typed and we only need a subset.
type BookingRow = {
  id: string;
  slot: string;
  status: string;
  request_id: string;
  quote_id: string;
  clinic_id: string;
  clinics?: { name: string; address: string };
  quotes?: { total: number; dentist_name_at_quote: string };
};

/**
 * /bookings — patient-facing list of upcoming + past consults.
 *
 * Previously the Bookings tab in PatientTabBar pointed here but the
 * route didn't exist, so tapping the tab dropped users into the
 * expo-router 404 screen. This restores the destination using the same
 * data + row pattern as /inbox; once /inbox is rebuilt as a true
 * messaging surface, the two will diverge in content.
 */
export default function BookingsScreen() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listMyBookings()
      .then((d) => setBookings(d as unknown as BookingRow[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcoming = bookings.filter((b) => new Date(b.slot) > new Date());
  const past = bookings.filter((b) => new Date(b.slot) <= new Date());

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Bookings" />
      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>
        <View className="px-8 pt-12 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Your appointments
          </Text>
          <Text className="font-display text-4xl text-espresso text-center leading-[1.05]">
            Consults & visits.
          </Text>
        </View>

        <Section title={loading ? "Upcoming" : `Upcoming · ${upcoming.length}`}>
          {loading ? (
            <View className="px-8 gap-3">
              <Skeleton height={72} />
              <Skeleton height={72} />
            </View>
          ) : upcoming.length === 0 ? (
            <Text className="text-sm text-taupe font-sans px-8">
              No upcoming consults.
            </Text>
          ) : (
            upcoming.map((b) => <BookingRowCard key={b.id} b={b} />)
          )}
        </Section>

        <Section title={loading ? "Past" : `Past · ${past.length}`}>
          {loading ? null : past.length === 0 ? (
            <Text className="text-sm text-taupe font-sans px-8">
              Nothing here yet.
            </Text>
          ) : (
            past.map((b) => <BookingRowCard key={b.id} b={b} />)
          )}
        </Section>
      </ScrollView>
      <PatientTabBar />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-12">
      <Text className="px-8 text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
        {title}
      </Text>
      <View className="px-8">{children}</View>
    </View>
  );
}

function BookingRowCard({ b }: { b: BookingRow }) {
  const router = useRouter();
  const when = new Date(b.slot).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <Pressable
      onPress={() => router.push({ pathname: "/booking/[id]", params: { id: b.id } })}
      className="border border-linen bg-eggshell/40 px-5 py-5 mb-3"
    >
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
          {b.status}
        </Text>
        <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
          {when}
        </Text>
      </View>
      <Text className="font-display text-lg text-espresso mb-1">
        {b.clinics?.name ?? "Clinic"}
      </Text>
      <View className="flex-row items-baseline justify-between">
        <Text className="font-sans text-xs text-walnut">
          {b.quotes?.dentist_name_at_quote ?? "Dentist"}
        </Text>
        {b.quotes?.total ? (
          <Text className="font-display text-xl text-gold">
            {formatAudDollars(b.quotes.total)}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
