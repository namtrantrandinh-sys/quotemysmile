import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Wordmark } from "@/components/Wordmark";
import { WinCelebration } from "@/components/WinCelebration";
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
  // Celebration on mount — confetti + ka-ching + haptic. Honours the
  // dentist's notificationPrefs (Settings → Notifications) so a busy
  // practice can quiet the sound/haptic without losing the visual.
  const [showCelebration, setShowCelebration] = useState(true);
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
      <WinCelebration
        visible={showCelebration}
        onClose={() => setShowCelebration(false)}
        kicker="New booking · won"
        title={`$${total} booked!`}
        body={`Sarah K reserved you for ${slotLabel}.`}
        ctaLabel="See the details"
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-8 py-16">
          {/* WON badge — bolder, larger, mint pill so it reads as a celebration
              chip rather than a quiet caption tag */}
          <View
            style={{
              backgroundColor: "#2E7268",
              paddingHorizontal: 22,
              paddingVertical: 8,
              borderRadius: 999,
              marginBottom: 24,
              shadowColor: "#2E7268",
              shadowOpacity: 0.18,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 4,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 13,
                letterSpacing: 3.5,
                textTransform: "uppercase",
                color: "#FFFFFF",
                fontWeight: "700",
              }}
            >
              Won
            </Text>
          </View>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-12">
            Sarah booked you.
          </Text>

          {/* Price band — espresso-dark amount, big, with sentence-case kicker.
              The previous gold #C8A75A reading on cream was too washed-out
              to feel like a meaningful payout figure. */}
          <View className="border-y border-linen py-12 w-full max-w-md items-center mb-10">
            <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-4">
              {slotLabel}
            </Text>
            <Text
              style={{
                fontFamily: "CormorantGaramond_700Bold",
                fontSize: 64,
                lineHeight: 68,
                color: "#2E7268",
                letterSpacing: -1.5,
                fontWeight: "700",
              }}
            >
              ${total}
            </Text>
            <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans mt-3">
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

          <View className="w-full max-w-md" style={{ gap: 12 }}>
            <Button variant="primary" size="lg" fullWidth>
              Send confirmation
            </Button>
            {/* Direct chat with the patient — ask for additional photos or
                a short video clip to refine the treatment plan before they
                arrive in chair. Disabled until we've resolved the latest
                booking row from the server. */}
            <Button
              variant="secondary"
              size="md"
              fullWidth
              leftSketch="chat"
              disabled={!latest?.id}
              onPress={() => {
                if (!latest?.id) return;
                router.push({
                  pathname: "/booking/messages/[id]",
                  params: { id: latest.id },
                });
              }}
            >
              Message patient
            </Button>
            <Button variant="secondary" size="md" fullWidth>
              Add to Cliniko
            </Button>
            <Button variant="ghost" size="md" fullWidth onPress={() => router.replace("/dentist")}>
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
