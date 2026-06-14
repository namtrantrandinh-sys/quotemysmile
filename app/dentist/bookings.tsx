import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { Skeleton } from "@/components/Skeleton";
import { listClinicBookings, markAttended } from "@/lib/services/bookings";

type Row = {
  id: string;
  slot: string;
  status: string;
  deposit_amount: number;
  deposit_status: string;
  quotes?: { total: number; dentist_name_at_quote: string };
};

export default function DentistBookingsScreen() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () =>
    listClinicBookings()
      .then((d) => setRows(d as unknown as Row[]))
      .catch(() => {})
      .finally(() => setLoading(false));

  useEffect(() => {
    void load();
  }, []);

  const handleMark = (id: string, attended: boolean) => {
    Alert.alert(
      attended ? "Mark attended?" : "Mark as no-show?",
      attended
        ? "Deposit will be credited to your invoice and the booking marked completed."
        : "Deposit will be forfeited (no-show fee). The patient will be notified.",
      [
        { text: "Back", style: "cancel" },
        {
          text: attended ? "Mark attended" : "Mark no-show",
          style: attended ? "default" : "destructive",
          onPress: async () => {
            try {
              await markAttended(id, attended);
              await load();
            } catch (e) {
              Alert.alert("Couldn't update", e instanceof Error ? e.message : "Try again.");
            }
          },
        },
      ],
    );
  };

  const upcoming = rows.filter((r) => r.status === "confirmed" && new Date(r.slot) > new Date());
  const today = rows.filter(
    (r) => r.status === "confirmed" && new Date(r.slot).toDateString() === new Date().toDateString(),
  );
  const past = rows.filter((r) => ["completed", "no_show", "cancelled"].includes(r.status));

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Clinic bookings" />
      <ScrollView>
        <View className="px-8 pt-10 pb-6 items-center">
          <Icon name="calendar" size={42} />
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mt-5 mb-2">
            Confirmed bookings
          </Text>
          <Text className="font-display text-4xl text-espresso text-center">
            {upcoming.length} upcoming
          </Text>
        </View>

        {loading ? (
          <View className="px-8 gap-3 mb-12">
            <Skeleton height={80} />
            <Skeleton height={80} />
          </View>
        ) : null}

        {today.length > 0 ? (
          <Section title="Today">
            {today.map((r) => (
              <Card key={r.id} r={r} onMark={handleMark} showActions />
            ))}
          </Section>
        ) : null}

        {upcoming.length > 0 ? (
          <Section title="Upcoming">
            {upcoming.map((r) => (
              <Card key={r.id} r={r} onMark={handleMark} />
            ))}
          </Section>
        ) : null}

        {past.length > 0 ? (
          <Section title="Past">
            {past.map((r) => (
              <Card key={r.id} r={r} onMark={handleMark} />
            ))}
          </Section>
        ) : null}

        {!loading && rows.length === 0 ? (
          <Text className="text-sm text-taupe font-sans text-center px-8 py-10">
            No bookings yet.
          </Text>
        ) : null}

        <View className="h-16" />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="px-8 mb-8">
      <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Card({ r, onMark, showActions }: { r: Row; onMark: (id: string, a: boolean) => void; showActions?: boolean }) {
  const when = new Date(r.slot).toLocaleString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <View className="border border-linen bg-eggshell/40 px-5 py-4 mb-3">
      <View className="flex-row items-center justify-between mb-2">
        <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">{r.status}</Text>
        <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">{when}</Text>
      </View>
      <Text className="font-sans text-sm text-walnut">
        Quote ${r.quotes?.total ?? "—"} · deposit ${r.deposit_amount / 100}
      </Text>
      {showActions ? (
        <View className="flex-row gap-2 mt-4">
          <Button variant="primary" size="sm" onPress={() => onMark(r.id, true)}>
            Mark attended
          </Button>
          <Button variant="secondary" size="sm" onPress={() => onMark(r.id, false)}>
            No-show
          </Button>
        </View>
      ) : null}
    </View>
  );
}
