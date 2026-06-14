import { useEffect } from "react";
import { View, Text, ScrollView, Linking, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Wordmark } from "@/components/Wordmark";
import { getQuote } from "@/lib/sampleQuotes";
import { notify as hapticNotify } from "@/lib/haptics";

function formatSlot(slot: string | undefined): string {
  if (!slot) return "Confirmed";
  const d = new Date(slot);
  if (Number.isNaN(d.getTime())) return slot;
  return d.toLocaleString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function BookedScreen() {
  const router = useRouter();
  const { id, slot, deposit, bookingId } = useLocalSearchParams<{
    id?: string;
    slot?: string;
    deposit?: string;
    bookingId?: string;
  }>();
  const q = getQuote(id ?? "") ?? getQuote("q-1")!;
  const when = formatSlot(slot);
  const depositAud = deposit ? Number(deposit) : null;

  // Success thunk on first render
  useEffect(() => {
    hapticNotify("success");
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 items-center justify-center px-8 py-20">
          <View className="h-2 w-2 rounded-full bg-gold mb-12" />
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            Confirmed
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-10">
            You're booked.
          </Text>

          <View className="border-y border-linen py-10 w-full max-w-md items-center mb-6">
            <Text className="font-display text-2xl text-walnut mb-1">{q.clinicName}</Text>
            <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans mb-6">
              {q.dentistName}
            </Text>
            <Text className="font-display text-3xl text-gold text-center">{when}</Text>
          </View>

          {depositAud ? (
            <View className="border border-gold/40 bg-gold/5 py-4 px-6 mb-8 items-center">
              <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans mb-1">
                Deposit secured
              </Text>
              <Text className="font-display text-xl text-gold">${depositAud}</Text>
              <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans mt-1 text-center">
                Refunded in full when you attend
              </Text>
            </View>
          ) : null}

          <View className="gap-4 items-center mb-12">
            <Button
              variant="secondary"
              size="md"
              onPress={() => {
                const dt = encodeURIComponent(when);
                const t = encodeURIComponent(
                  `QuoteMySmile: ${q.clinicName} — ${q.dentistName}`,
                );
                const url = `https://www.google.com/calendar/render?action=TEMPLATE&text=${t}&dates=20260615T090000Z/20260615T100000Z&details=${dt}`;
                Linking.openURL(url).catch(() =>
                  Alert.alert("Couldn't open calendar"),
                );
              }}
            >
              Add to calendar
            </Button>
            <Button
              variant="secondary"
              size="md"
              onPress={() => {
                const q2 = encodeURIComponent(`${q.clinicName} ${q.suburb}`);
                Linking.openURL(`https://maps.apple.com/?q=${q2}`).catch(() =>
                  Alert.alert("Couldn't open maps"),
                );
              }}
            >
              Get directions
            </Button>
            {bookingId ? (
              <Button
                variant="ghost"
                size="md"
                onPress={() =>
                  router.push({
                    pathname: "/booking/messages/[id]",
                    params: { id: bookingId },
                  })
                }
              >
                Message clinic
              </Button>
            ) : null}
          </View>

          <Text className="text-xs text-taupe font-sans text-center max-w-md leading-relaxed mb-12">
            Other quotes stay in your inbox for seven days. Cancel any time
            up to 24 hours before your consult.
          </Text>

          <Button variant="secondary" size="lg" onPress={() => router.replace("/")}>
            Back to home
          </Button>
        </View>
        <View className="px-8 py-10 items-center">
          <Wordmark size="sm" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
