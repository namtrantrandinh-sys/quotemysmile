import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { Chip } from "@/components/Chip";
import { Checkbox } from "@/components/Checkbox";
import { FieldLabel } from "@/components/FieldLabel";
import { Icon } from "@/components/Icon";
import { getQuote as getSampleQuote } from "@/lib/sampleQuotes";
import {
  createDepositIntent,
  depositTierForQuote,
  abandonPendingBooking,
} from "@/lib/services/bookings";
import { getQuote as fetchQuote } from "@/lib/services/quotes";
import { supabase } from "@/lib/supabase";
import { CONSULT_FEE_LINE } from "@/lib/copy";
import { useStripe } from "@stripe/stripe-react-native";
import { breadcrumb, captureError } from "@/lib/observability";

/**
 * Build a list of advance bookable slots from the dentist's submitted availability,
 * falling back to a sensible 7-day grid if none provided.
 */
function buildAdvanceSlots(isoList: string[]): Array<{
  id: string;
  iso: string;
  label: string;
  daysAhead: number;
}> {
  const base =
    isoList.length > 0
      ? isoList
      : Array.from({ length: 8 }).map((_, i) =>
          new Date(Date.now() + (i + 1) * 12 * 3600_000).toISOString(),
        );

  return base.map((iso) => {
    const d = new Date(iso);
    const dayPart = d.toLocaleDateString("en-AU", {
      weekday: "short",
      day: "numeric",
      month: "short",
    });
    const timePart = d.toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
    });
    return {
      id: iso,
      iso,
      label: `${dayPart} · ${timePart}`,
      daysAhead: Math.floor((d.getTime() - Date.now()) / (24 * 3600_000)),
    };
  });
}

export default function BookScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const stripe = useStripe();

  const [q, setQ] = useState<{
    id: string;
    dentistName: string;
    clinicName: string;
    total: number;
    requestId?: string;
    clinicId?: string;
    availability: string[];
    isDemo?: boolean;
  } | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<{
    title: string;
    body: string;
    code?: string;
  } | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchQuote(id)
      .then((row: any) => {
        if (!row) {
          const sample = getSampleQuote(id) ?? getSampleQuote("q-1")!;
          setQ({
            id: sample.id,
            dentistName: sample.dentistName,
            clinicName: sample.clinicName,
            total: sample.total,
            availability: [],
            isDemo: true,
          });
          return;
        }
        setQ({
          id: row.id,
          dentistName: row.dentist_name_at_quote,
          clinicName: row.clinics?.name ?? "Clinic",
          total: row.total,
          requestId: row.request_id,
          clinicId: row.clinic_id,
          availability: (row.availability_slots as string[]) ?? [],
        });
      })
      .catch(() => {
        const sample = getSampleQuote(id) ?? getSampleQuote("q-1")!;
        setQ({
          id: sample.id,
          dentistName: sample.dentistName,
          clinicName: sample.clinicName,
          total: sample.total,
          availability: [],
        });
      });
  }, [id]);

  const slots = useMemo(() => (q ? buildAdvanceSlots(q.availability) : []), [q]);
  const depositAud = useMemo(
    () => (q ? depositTierForQuote(q.total) : 50),
    [q],
  );

  useEffect(() => {
    if (!slot && slots.length > 0) setSlot(slots[0].id);
  }, [slots, slot]);

  if (!q) {
    return (
      <SafeAreaView className="flex-1 bg-bone">
        <BackBar title="Book consult" />
      </SafeAreaView>
    );
  }

  const handleConfirm = async () => {
    if (q.isDemo) {
      Alert.alert(
        "Demo quote",
        "This is a sample quote shown before you sign up. Send your own photos to book a real consult.",
      );
      return;
    }
    if (!slot || !ack) {
      Alert.alert("Almost there", "Pick a time and tick the acknowledgement.");
      return;
    }
    setFailure(null);
    setBusy(true);
    breadcrumb("payment", "book.handleConfirm", {
      quoteId: q.id,
      depositAud,
      slot,
    });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && q.requestId && q.clinicId) {
        // Guard before creating any backend rows so we don't leave orphan
        // pending bookings if Stripe SDK isn't ready (e.g. mid-hydration on web).
        if (!stripe) {
          setFailure({
            title: "Payment provider unavailable",
            body: "Apple Pay / Google Pay isn't ready yet. Try again in a moment.",
          });
          return;
        }
        // Real path — kick off Stripe PaymentIntent + create pending booking row.
        const { clientSecret, bookingId } = await createDepositIntent({
          quoteId: q.id,
          requestId: q.requestId,
          slotIso: slot,
          depositAud,
        });
        const { error: initErr } = await stripe.initPaymentSheet({
          paymentIntentClientSecret: clientSecret,
          merchantDisplayName: "QuoteMySmile",
          applePay: { merchantCountryCode: "AU" },
          googlePay: { merchantCountryCode: "AU", currencyCode: "AUD" },
          allowsDelayedPaymentMethods: false,
        });
        if (initErr) {
          captureError(new Error(initErr.message), {
            ctx: "stripe.initPaymentSheet",
            code: initErr.code,
          });
          // Sheet failed to init — the backend already wrote a pending
          // booking row. Sweep it so the slot is freed and the patient
          // can retry without "you already have a booking" errors.
          void abandonPendingBooking(bookingId).catch(() => {});
          setFailure({
            title: "Couldn't open Apple Pay / card sheet",
            body: initErr.message,
            code: initErr.code,
          });
          return;
        }
        const { error: presentErr } = await stripe.presentPaymentSheet();
        if (presentErr) {
          if (presentErr.code === "Canceled") {
            // User backed out — silent, no banner, leave the slot picker armed.
            // Sweep the pending booking row created server-side; otherwise
            // it would loiter and block the same slot from being rebooked.
            breadcrumb("payment", "stripe.canceled");
            void abandonPendingBooking(bookingId).catch(() => {});
            return;
          }
          captureError(new Error(presentErr.message), {
            ctx: "stripe.presentPaymentSheet",
            code: presentErr.code,
          });
          // Payment failed — sweep the pending row so retry isn't blocked.
          void abandonPendingBooking(bookingId).catch(() => {});
          // Frame the message so the patient knows it's recoverable.
          const friendly =
            presentErr.code === "Failed"
              ? "Your bank declined the card. Try another card or Apple Pay."
              : presentErr.code === "Timeout"
                ? "The payment timed out. Try again."
                : presentErr.message;
          setFailure({
            title: "Payment didn't go through",
            body: friendly,
            code: presentErr.code,
          });
          return;
        }
        // Webhook flips deposit_status=paid once Stripe confirms.
        router.replace({
          pathname: "/booked",
          params: { id: q.id, slot, deposit: String(depositAud), bookingId },
        });
        return;
      }
      // Demo path (not signed in)
      router.replace({
        pathname: "/booked",
        params: { id: q.id, slot, deposit: String(depositAud) },
      });
    } catch (e) {
      captureError(e, { ctx: "book.handleConfirm" });
      setFailure({
        title: "Couldn't start payment",
        body: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Book consult" />
      {q.isDemo ? (
        <View
          style={{
            backgroundColor: "rgba(168,132,61,0.10)",
            borderBottomWidth: 1,
            borderBottomColor: "rgba(168,132,61,0.30)",
            paddingVertical: 8,
            paddingHorizontal: 18,
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontFamily: "Inter-Medium",
              fontSize: 10,
              letterSpacing: 1.6,
              textTransform: "uppercase",
              color: "#A8843D",
            }}
          >
            Demo · sample quote — booking is disabled
          </Text>
        </View>
      ) : null}
      <ScrollView>
        <View className="px-8 pt-12 pb-6 items-center">
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-3">
            {q.clinicName}
          </Text>
          <Text className="font-display text-3xl text-espresso mb-1">
            {q.dentistName}
          </Text>
          <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">
            {CONSULT_FEE_LINE}
          </Text>
        </View>

        <View className="px-8 mb-10">
          <Text className="font-sans text-sm text-walnut text-center leading-relaxed">
            Final fees confirmed at your clinical examination.
          </Text>
        </View>

        {/* ============ Advance scheduling ============ */}
        <View className="px-8 mb-10">
          <FieldLabel
            label="Pick a time that suits"
            hint="Book up to 7 days in advance to fit the clinic's calendar."
          >
            <View className="flex-row flex-wrap gap-2">
              {slots.map((s) => (
                <Chip
                  key={s.id}
                  label={s.label}
                  selected={slot === s.id}
                  onPress={() => setSlot(s.id)}
                />
              ))}
            </View>
          </FieldLabel>
        </View>

        {/* ============ Deposit card ============ */}
        <View className="px-8 mb-10">
          <View className="border border-gold/40 bg-gold/5 p-5">
            <View className="flex-row items-center gap-3 mb-3">
              <Icon name="lock" size={22} color="#A9CFC0" />
              <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
                Booking deposit
              </Text>
            </View>
            <Text className="font-display text-4xl text-gold mb-2">
              ${depositAud}
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-3">
              Pay a ${depositAud} platform security deposit to secure your slot —
              held by QuoteMySmile, never by the clinic. Refunded in full when
              you attend.
            </Text>
            <View className="border-t border-gold/20 pt-3 gap-1.5">
              <Row
                icon="check"
                text={`Refunded $${depositAud} in full when you attend`}
              />
              <Row icon="check" text="Fully refunded if you cancel 24h before" />
              <Row
                icon="emergency"
                text="Forfeited if you no-show (clinic time wasted)"
                tone="clay"
              />
            </View>
          </View>
        </View>

        {/* ============ Details ============ */}
        <View className="px-8 mb-10">
          <FieldLabel label="Your details">
            <View className="gap-3">
              <RowKV k="Name" v="Sarah K" verified />
              <RowKV k="Mobile" v="0412 *** 891" verified />
              <RowKV k="Email" v="sarah@email.com" verified />
            </View>
          </FieldLabel>
        </View>

        {/* ============ Ack ============ */}
        <View className="px-8 mb-10">
          <View className="border border-linen bg-eggshell/40 p-5">
            <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-2">
              Before you book
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-4">
              The ${depositAud} is a refundable platform security deposit, not
              a referral fee. The entire amount is refunded to your card
              within 5 business days of your visit. QuoteMySmile is free for
              patients — our A$5 platform fee is paid by the dentist on
              attended bookings, never billed to you. Final consult +
              treatment fees are paid directly to{" "}
              {q.dentistName.split(" ").slice(-1)[0]} at your clinical exam.
              The quote is indicative until then.
            </Text>
            <Checkbox
              checked={ack}
              onToggle={() => setAck(!ack)}
              label={`I understand the $${depositAud} deposit and cancellation policy.`}
            />
          </View>
        </View>

        {failure ? (
          <View className="px-8 mb-6">
            <View className="border border-clay/40 bg-clay/5 p-5">
              <View className="flex-row items-center gap-3 mb-2">
                <Icon name="emergency" size={16} color="#9E5E47" />
                <Text className="text-[11px] tracking-cap uppercase text-clay font-sans">
                  {failure.title}
                </Text>
              </View>
              <Text className="text-sm text-walnut font-sans leading-relaxed mb-3">
                {failure.body}
              </Text>
              <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-4">
                No deposit was charged. Your slot is still held while you retry.
              </Text>
              <View className="flex-row gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => {
                    setFailure(null);
                    handleConfirm();
                  }}
                >
                  Try again
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => {
                    setFailure(null);
                    setSlot(null);
                  }}
                >
                  Pick another slot
                </Button>
              </View>
            </View>
          </View>
        ) : null}

        <View className="px-8 pb-24 items-center">
          <Button
            variant="primary"
            size="lg"
            onPress={handleConfirm}
            disabled={busy}
          >
            {busy ? "Securing slot…" : `Pay $${depositAud} & secure booking`}
          </Button>
          <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-4">
            Payment via Stripe · Apple Pay · Google Pay
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  text,
  tone,
}: {
  icon: "check" | "emergency";
  text: string;
  tone?: "clay";
}) {
  return (
    <View className="flex-row items-start gap-3">
      <Icon name={icon} size={14} color={tone === "clay" ? "#9E5E47" : "#4A6B4F"} />
      <Text className="flex-1 text-xs text-walnut font-sans leading-relaxed">
        {text}
      </Text>
    </View>
  );
}

function RowKV({ k, v, verified }: { k: string; v: string; verified?: boolean }) {
  return (
    <View className="flex-row items-center justify-between py-3 border-b border-linen">
      <View>
        <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-0.5">
          {k}
        </Text>
        <Text className="font-sans text-sm text-espresso">{v}</Text>
      </View>
      {verified ? (
        <Text className="text-[10px] tracking-cap uppercase text-forest font-sans">
          Verified
        </Text>
      ) : null}
    </View>
  );
}
