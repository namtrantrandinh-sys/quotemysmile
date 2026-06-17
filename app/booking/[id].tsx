import { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, Linking } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Icon } from "@/components/Icon";
import { getBooking, cancelBooking } from "@/lib/services/bookings";

type Booking = {
  id: string;
  slot: string;
  status: string;
  clinic_id: string;
  quote_id: string;
  request_id: string;
  deposit_amount: number;
  deposit_status: string;
  cancellation_window_hours: number;
  clinics?: { name: string; address: string } | null;
  quotes?: { id: string; total: number; dentist_name_at_quote: string } | null;
};

export default function BookingDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [b, setB] = useState<Booking | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    getBooking(id).then((d) => setB(d as unknown as Booking)).catch(() => {});
  }, [id]);

  if (!b) {
    return (
      <SafeAreaView className="flex-1 bg-bone">
        <BackBar title="Booking" />
      </SafeAreaView>
    );
  }

  // Clamp to 0 — a slot in the past would otherwise show a negative
  // "X hours until cancellation" string in the policy block.
  const hoursUntil = Math.max(
    0,
    (new Date(b.slot).getTime() - Date.now()) / 3600_000,
  );
  const eligibleRefund = hoursUntil >= b.cancellation_window_hours;
  const slotLabel = new Date(b.slot).toLocaleString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });

  const handleCancel = () => {
    Alert.alert(
      eligibleRefund ? "Cancel & refund deposit?" : "Cancel anyway?",
      eligibleRefund
        ? `Your $${b.deposit_amount / 100} deposit will be refunded.`
        : `It's within ${b.cancellation_window_hours}h of your appointment, so the $${b.deposit_amount / 100} deposit will be forfeited.`,
      [
        { text: "Back", style: "cancel" },
        {
          text: "Confirm cancel",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              const r = await cancelBooking(b.id);
              Alert.alert(
                r.refunded ? "Booking cancelled" : "Booking cancelled",
                r.refunded
                  ? "Your deposit will appear back on your card within 5 business days."
                  : "Deposit forfeited as per the cancellation policy.",
              );
              router.replace("/inbox");
            } catch (e) {
              Alert.alert("Could not cancel", e instanceof Error ? e.message : "Try again.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const dentistName = b.quotes?.dentist_name_at_quote ?? "Dr ?";
  const dentistInitials = dentistName
    .replace(/^Dr\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Booking" />
      <ScrollView>
        {/* Meet-your-dentist hero — Pattern #6 from the research.
            Single biggest trust moment in the funnel: front-load the
            human, not the calendar. */}
        <View
          style={{
            position: "relative",
            height: 220,
            marginBottom: 70,
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "#5FA89B",
              overflow: "hidden",
            }}
          >
            <View
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: "#3F7E73",
                opacity: 0.55,
                transform: [{ skewY: "-3deg" }, { translateY: 60 }],
              }}
            />
            <View
              style={{
                position: "absolute",
                top: -30, right: -40, width: 220, height: 220, borderRadius: 110,
                backgroundColor: "rgba(255,255,255,0.10)",
              }}
            />
          </View>
          {/* Floating initials circle — overlaps gradient + content */}
          <View
            style={{
              position: "absolute",
              bottom: -52,
              left: 0,
              right: 0,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 104,
                height: 104,
                borderRadius: 52,
                backgroundColor: "#F5F1E8",
                borderWidth: 4,
                borderColor: "rgba(255,255,255,0.95)",
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#1F4F47",
                shadowOpacity: 0.25,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 8,
              }}
            >
              <Text
                style={{
                  fontFamily: "CormorantGaramond-Medium",
                  fontSize: 38,
                  color: "#3F7E73",
                  letterSpacing: -0.5,
                }}
              >
                {dentistInitials}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-8 pt-2 pb-2 items-center">
          <Text
            style={{
              fontFamily: "Caveat",
              fontSize: 22,
              color: "#3F7E73",
              marginBottom: 4,
            }}
          >
            You're booked with
          </Text>
          <Text className="font-display text-3xl text-espresso text-center mb-1">
            {dentistName}
          </Text>
          <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans mb-6">
            {b.clinics?.name ?? "Clinic"}
          </Text>

          {/* Appointment slot — quieter than before, no longer the hero */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: "rgba(95,168,155,0.10)",
              borderWidth: 1,
              borderColor: "rgba(95,168,155,0.25)",
              marginBottom: 8,
            }}
          >
            <Icon name="calendar" size={14} color="#3F7E73" />
            <Text
              style={{
                fontFamily: "Inter-Medium",
                fontSize: 13,
                color: "#2A2520",
                letterSpacing: 0.2,
              }}
            >
              {slotLabel}
            </Text>
          </View>
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mt-4">
            {b.status}
          </Text>
        </View>

        {/* Deposit */}
        <View className="px-8 mb-8">
          <View className="border border-gold/40 bg-gold/5 p-5">
            <View className="flex-row items-center gap-3 mb-2">
              <Icon name="lock" size={20} color="#A9CFC0" />
              <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
                Deposit · {b.deposit_status}
              </Text>
            </View>
            <Text className="font-display text-3xl text-gold mb-1">
              ${b.deposit_amount / 100}
            </Text>
            <Text className="text-xs text-walnut font-sans leading-relaxed">
              {b.deposit_status === "paid"
                ? `Held by QuoteMySmile until your visit. Refunded in full ($${b.deposit_amount / 100}) to your card on attendance.`
                : b.deposit_status === "credited"
                  ? `Refunded in full — $${b.deposit_amount / 100} back to your card within 5 business days.`
                  : b.deposit_status === "refunded"
                    ? "Refunded in full — should appear back on your card within 5 business days."
                    : b.deposit_status === "forfeited"
                      ? "Forfeited as per cancellation policy."
                      : "Pending Stripe confirmation."}
            </Text>
          </View>
        </View>

        {/* Cancellation window */}
        <View className="px-8 mb-8">
          <View className="border border-linen bg-eggshell/40 p-5">
            <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans mb-2">
              Cancellation policy
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed">
              {eligibleRefund
                ? `Free cancellation until ${Math.floor(hoursUntil - b.cancellation_window_hours)}h from now. After that, the deposit is held by the clinic.`
                : `It's within the ${b.cancellation_window_hours}h cancellation window. Cancelling now means the clinic keeps the deposit.`}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View className="px-8 pb-24 gap-4 items-center">
          {b.clinics?.address ? (
            <Button
              variant="secondary"
              size="md"
              onPress={() =>
                Linking.openURL(
                  `https://maps.apple.com/?q=${encodeURIComponent(b.clinics!.address)}`,
                )
              }
            >
              Get directions
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="md"
            onPress={() =>
              router.push({
                pathname: "/booking/messages/[id]",
                params: { id: b.id },
              })
            }
          >
            Message clinic
          </Button>
          {b.status === "confirmed" ? (
            <Button variant="ghost" size="md" onPress={handleCancel}>
              {busy ? "Cancelling…" : "Cancel booking"}
            </Button>
          ) : null}
          {b.status === "completed" ? (
            <Button
              variant="primary"
              size="md"
              onPress={() =>
                router.push({ pathname: "/review/[bookingId]", params: { bookingId: b.id } })
              }
            >
              Leave a review
            </Button>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
