import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { QuoteCard } from "@/components/QuoteCard";
import type { Quote } from "@/lib/types";
import { LiveBadge } from "@/components/LiveBadge";
import { Disclaimer } from "@/components/Disclaimer";
import { Wordmark } from "@/components/Wordmark";
import { Skeleton } from "@/components/Skeleton";
import { Toast } from "@/components/Toast";
import { LongDisclaimerModal } from "@/components/LongDisclaimerModal";
import { ViewToggle } from "@/components/ViewToggle";
import { QuotesMap } from "@/components/QuotesMap";
import { NewQuoteTicker, type TickerItem } from "@/components/NewQuoteTicker";
import { PatientTabBar } from "@/components/PatientTabBar";
import { PushSoftPrompt } from "@/components/PushSoftPrompt";
import { tap as hapticTap, notify as hapticNotify } from "@/lib/haptics";
import { SAMPLE_QUOTES, PATIENT_PIN } from "@/lib/sampleQuotes";
import { useLocation } from "@/hooks/useLocation";
import {
  listQuotesForRequest,
  subscribeQuotesForRequest,
  subscribeTyping,
  clinicGeoForRequest,
} from "@/lib/services/quotes";

const INITIAL_QUOTES: Quote[] = SAMPLE_QUOTES;

type QuoteRow = {
  id: string;
  request_id: string;
  clinic_id: string;
  dentist_id: string;
  total: number;
  previous_total: number | null;
  note: string | null;
  status: string;
  ahpra_no: string;
  dentist_name_at_quote: string;
};

function toViewQuote(row: QuoteRow): Quote {
  return {
    id: row.id,
    clinicName: "Clinic",
    dentistName: row.dentist_name_at_quote,
    suburb: "Nearby",
    distanceKm: 0,
    rating: 0,
    reviewCount: 0,
    availability: "—",
    total: row.total,
    previousTotal: row.previous_total ?? undefined,
    ahpraNo: row.ahpra_no,
    isFinal: row.status === "final",
    // lat/lng come via a separate map RPC; left undefined here so map view
    // gracefully degrades when geo isn't loaded yet.
  };
}

const FIRST_QUOTE_ACK_KEY = "qms.firstQuoteAcked";

export default function LiveFeedScreen() {
  const router = useRouter();
  const { request } = useLocalSearchParams<{ request?: string }>();
  const [quotes, setQuotes] = useState<Quote[]>(request ? [] : INITIAL_QUOTES);
  const [secondsLeft, setSecondsLeft] = useState(24 * 60 + 48);
  const [typing, setTyping] = useState(request ? "" : "Dr Patel");
  const [initialLoading, setInitialLoading] = useState(!!request);
  const [toast, setToast] = useState<{ title: string; subtitle?: string } | null>(null);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const ackRef = useRef<boolean>(false);
  const [view, setView] = useState<"list" | "map">("list");
  const [ticker, setTicker] = useState<TickerItem[]>([]);
  const loc = useLocation({ auto: true });
  const patientPin = loc.coords ?? PATIENT_PIN;

  // Show the long disclaimer once per device on the first-ever quote received.
  useEffect(() => {
    if (quotes.length > 0 && !ackRef.current) {
      ackRef.current = true;
      setShowDisclaimer(true);
    }
  }, [quotes.length]);

  useEffect(() => {
    const t = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  // When the window expires, prevent further booking + show closed state.
  const closed = secondsLeft === 0;

  // Demo simulation (no request id) — keep the dopamine drop
  useEffect(() => {
    if (request) return;
    const t = setTimeout(() => {
      setQuotes((qs) => [
        ...qs,
        {
          id: "4",
          clinicName: "East Melbourne Dental",
          dentistName: "Dr Liam O'Connor",
          suburb: "East Melbourne, VIC",
          distanceKm: 5.2,
          rating: 4.9,
          reviewCount: 311,
          availability: "Tomorrow 11:30 am",
          total: 365,
          ahpraNo: "DEN0009988776",
          justIn: true,
        },
      ]);
      setTyping("");
    }, 6000);
    return () => clearTimeout(t);
  }, [request]);

  // Typing presence — show "Dr X is preparing a quote"
  useEffect(() => {
    if (!request) return;
    const ch = subscribeTyping(request, (names) => {
      setTyping(names[0] ?? "");
    });
    return () => {
      (ch as any)?.unsubscribe?.();
    };
  }, [request]);

  // Real path — load existing quotes, then subscribe to Realtime
  useEffect(() => {
    if (!request) return;
    let isMounted = true;

    Promise.all([
      listQuotesForRequest(request),
      clinicGeoForRequest(request).catch(() => []),
    ])
      .then(([rows, geo]) => {
        if (!isMounted) return;
        const geoMap = new Map(geo.map((g) => [g.quote_id, g]));
        setQuotes(
          (rows as QuoteRow[]).map((r) => ({
            ...toViewQuote(r),
            lat: geoMap.get(r.id)?.lat,
            lng: geoMap.get(r.id)?.lng,
          })),
        );
      })
      .catch(() => {
        // RLS will block until the patient is signed in — fall back to demo
      })
      .finally(() => {
        if (isMounted) setInitialLoading(false);
      });

    const channel = subscribeQuotesForRequest(request, (payload: any) => {
      if (!isMounted) return;
      if (payload.eventType === "INSERT") {
        const q = toViewQuote(payload.new);
        hapticNotify("success");
        setQuotes((qs) => [{ ...q, justIn: true }, ...qs]);
        setToast({
          title: "New quote arrived",
          subtitle: `${q.dentistName} · $${q.total}`,
        });
        setTicker((t) =>
          [
            {
              id: q.id,
              dentistName: q.dentistName,
              clinicName: q.clinicName,
              total: q.total,
              arrivedAt: Date.now(),
            },
            ...t,
          ].slice(0, 5),
        );
      } else if (payload.eventType === "UPDATE") {
        setQuotes((qs) =>
          qs.map((q) => (q.id === payload.new.id ? toViewQuote(payload.new) : q)),
        );
      }
    });

    return () => {
      isMounted = false;
      (channel as any)?.unsubscribe?.();
    };
  }, [request]);

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <Toast
        visible={!!toast}
        title={toast?.title ?? ""}
        subtitle={toast?.subtitle}
        tone="gold"
      />
      <LongDisclaimerModal
        visible={showDisclaimer}
        onAccept={() => setShowDisclaimer(false)}
      />
      <NewQuoteTicker
        items={ticker}
        onPress={(id) =>
          router.push({ pathname: "/quote/[id]", params: { id } })
        }
      />
      <PushSoftPrompt trigger={quotes.length} />
      <ScrollView>
        {/* Status header */}
        <View className="px-8 py-6 border-b border-linen flex-row items-center justify-between">
          <Pressable onPress={() => router.back()}>
            <Wordmark size="sm" />
          </Pressable>
          <View className="flex-row items-center gap-6">
            <LiveBadge />
            <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
              Closes {mm}:{ss}
            </Text>
          </View>
        </View>

        {/* Title block */}
        <View className="px-8 pt-16 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6 text-center">
            {closed ? "Window closed" : "Your quotes · live"}
          </Text>
          <Text className="font-display text-5xl text-espresso text-center mb-6">
            {quotes.length} {quotes.length === 1 ? "quote" : "quotes"}
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed mb-8">
            {closed
              ? "Quotes are valid for 7 days. Book any of them at your own pace."
              : `Streaming from AHPRA-registered dentists near you. Window closes in ${mm}:${ss}.`}
          </Text>
          <ViewToggle
            value={view}
            onChange={(v) => {
              hapticTap("light");
              setView(v as "list" | "map");
            }}
            options={[
              { id: "list", label: "List" },
              { id: "map", label: "Map" },
            ]}
          />
        </View>

        {view === "map" ? (
          <View className="w-full max-w-2xl self-center mb-8">
            <QuotesMap
              quotes={quotes}
              patient={{ lat: patientPin.lat, lng: patientPin.lng }}
              radiusKm={10}
              onQuoteSelect={(q) =>
                router.push({ pathname: "/quote/[id]", params: { id: q.id } })
              }
            />
          </View>
        ) : null}

        {/* Quotes feed (list view) */}
        {view === "list" ? (
        <View className="px-8 max-w-2xl w-full self-center">
          {initialLoading ? (
            <View className="py-12 gap-10">
              {[1, 2].map((i) => (
                <View key={i} className="items-center gap-4">
                  <Skeleton height={16} width={140} />
                  <Skeleton height={48} width={120} />
                  <Skeleton height={12} width={200} />
                </View>
              ))}
            </View>
          ) : quotes.length === 0 ? (
            <View className="py-20 items-center">
              <View className="h-2 w-2 rounded-full bg-forest mb-8" />
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
                Awaiting first quote
              </Text>
              <Text className="font-display text-3xl text-espresso text-center leading-[1.1] mb-6">
                Dentists are reviewing your photos.
              </Text>
              <Text className="text-sm text-walnut font-sans text-center max-w-sm leading-relaxed">
                First quotes usually arrive within 5 minutes. We'll alert you the
                moment the first one lands.
              </Text>
            </View>
          ) : (
            quotes.map((q) => <QuoteCard key={q.id} q={q} />)
          )}

          {typing && !initialLoading ? (
            <View className="py-10 items-center">
              <Text className="text-xs tracking-cap uppercase text-taupe font-sans">
                ●●●  {typing} is preparing a quote
              </Text>
            </View>
          ) : null}
        </View>
        ) : null}

        {/* Long disclaimer */}
        <View className="px-8 py-16 max-w-2xl w-full self-center">
          <Disclaimer variant="medium" />
        </View>

        {/* Footer */}
        <View className="px-8 py-10 border-t border-linen flex-row items-center justify-between">
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans">
            Sort · Best match
          </Text>
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans">
            ● Lowest indicative
          </Text>
        </View>
      </ScrollView>
      <PatientTabBar />
    </SafeAreaView>
  );
}
