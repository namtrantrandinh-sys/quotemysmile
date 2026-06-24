import { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { QuoteCard } from "@/components/QuoteCard";
import type { Quote, Urgency } from "@/lib/types";
import { URGENCY_META } from "@/lib/types";
import { getRequest } from "@/lib/services/requests";
import { LiveBadge } from "@/components/LiveBadge";
import { Disclaimer } from "@/components/Disclaimer";
import { Wordmark } from "@/components/Wordmark";
import { Skeleton } from "@/components/Skeleton";
import { Toast } from "@/components/Toast";
import { LongDisclaimerModal } from "@/components/LongDisclaimerModal";
import { ViewToggle } from "@/components/ViewToggle";
import { QuotesMap } from "@/components/QuotesMap";
import { GpsRadar } from "@/components/GpsRadar";
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
    note: row.note ?? undefined,
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
  const [sortBy, setSortBy] = useState<"price" | "distance" | "rating">("price");
  const [ticker, setTicker] = useState<TickerItem[]>([]);

  // Apply the active sort to the streaming quote list. Stable enough that
  // a new quote arriving doesn't cause the entire list to leap; we use a
  // shallow copy so React.memo on QuoteCard still optimises re-renders.
  const sortedQuotes = useMemo(() => {
    const arr = [...quotes];
    if (sortBy === "price") {
      arr.sort((a, b) => a.total - b.total);
    } else if (sortBy === "distance") {
      arr.sort((a, b) => a.distanceKm - b.distanceKm);
    } else if (sortBy === "rating") {
      // Bayesian-ish: high rating + many reviews wins over high rating + 1 review.
      const score = (q: Quote) => q.rating * Math.log10(1 + q.reviewCount);
      arr.sort((a, b) => score(b) - score(a));
    }
    return arr;
  }, [quotes, sortBy]);
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

  // Real-request path: derive the actual remaining window from the request's
  // created_at + urgency rather than the demo fallback. If the request was
  // submitted long enough ago that the window has elapsed, clamp to 0 so the
  // UI immediately shows "Window closed" instead of running a fake countdown.
  useEffect(() => {
    if (!request) return;
    let cancelled = false;
    getRequest(request)
      .then((row: any) => {
        if (cancelled || !row) return;
        const urgency = (row.urgency as Urgency) ?? "few";
        const closesInMin = URGENCY_META[urgency]?.closesInMin ?? 180;
        const createdAt = new Date(row.created_at).getTime();
        const elapsedSec = Math.floor((Date.now() - createdAt) / 1000);
        const remaining = closesInMin * 60 - elapsedSec;
        setSecondsLeft(Math.max(0, Math.min(closesInMin * 60, remaining)));
      })
      .catch(() => {
        // Leave the demo countdown alone if the fetch fails (offline / RLS).
      });
    return () => {
      cancelled = true;
    };
  }, [request]);

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

  // Show an absolute time ("Closes 4:30 pm") instead of mm:ss countdown.
  // Pattern #11 (research): urgency-marketing countdowns destroy the calm
  // premium register. Real expiries shown as dates and times.
  const closesAt = new Date(Date.now() + secondsLeft * 1000);
  const closesLabel = closesAt.toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
  });
  // Show day prefix if it's not today (e.g. urgency = "3d")
  const closesIsToday = closesAt.toDateString() === new Date().toDateString();
  const closesDisplay = closesIsToday
    ? `Closes ${closesLabel}`
    : `Closes ${closesAt.toLocaleDateString("en-AU", { weekday: "short" })} ${closesLabel}`;

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
      {/* Apple 2.1b — demo data must be clearly labelled. When the user
          arrives here via the "Live demo" pill on welcome (no request
          param), surface a persistent banner so they (and reviewers)
          never mistake seeded sample data for live quotes. */}
      {!request ? (
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
            Demo · sample quotes — sign up to send your own photos
          </Text>
        </View>
      ) : null}
      <ScrollView>
        {/* Status header — demo mode replaces the Wordmark with a single
            back chevron at the top-left, and drops the LiveBadge +
            countdown on the right (irrelevant for a demo). */}
        <View className="px-8 py-6 border-b border-linen flex-row items-center justify-between">
          {!request ? (
            <Pressable
              onPress={() => {
                // router.back() throws "GO_BACK not handled" on direct
                // deep-links / cold launches into /live (no history).
                // Fall back to the welcome screen so the chevron is
                // always safe to tap.
                if (router.canGoBack()) router.back();
                else router.replace("/");
              }}
              hitSlop={12}
              accessibilityLabel="Back"
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "#E5DCC8",
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  color: "#2A2520",
                  fontFamily: "Inter",
                  lineHeight: 18,
                  marginTop: -2,
                }}
              >
                ←
              </Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => router.back()}>
              <Wordmark size="sm" />
            </Pressable>
          )}
          {request ? (
            <View className="flex-row items-center gap-6">
              <LiveBadge />
              <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
                {closesDisplay}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Title block */}
        <View className="px-8 pt-16 pb-8 items-center">
          {/* Demo-only — show the GPS broadcast moment so the demo
              covers BOTH "how a quote looks" and "how the GPS finds
              dentists for you". On a real /live (request param present)
              we skip this; the user has already seen the radar on the
              submitting screen and doesn't need a second pass. */}
          {!request ? (
            <View className="items-center mb-10">
              <GpsRadar size={180} pinCount={5} sweep={true} />
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mt-4">
                Sample broadcast · Camberwell VIC
              </Text>
            </View>
          ) : null}
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6 text-center">
            {closed ? "Window closed" : "Your quotes · live"}
          </Text>
          <Text className="font-display text-5xl text-espresso text-center mb-6">
            {quotes.length} {quotes.length === 1 ? "quote" : "quotes"}
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed mb-8">
            {closed
              ? "Quotes are valid for 7 days. Book any of them at your own pace."
              : `Streaming from AHPRA-registered dentists near you. Window closes ${closesIsToday ? closesLabel.toLowerCase() : `${closesAt.toLocaleDateString("en-AU", { weekday: "long" })} ${closesLabel.toLowerCase()}`}.`}
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

          {/* Sort — only meaningful when there is more than one quote */}
          {quotes.length > 1 ? (
            <View className="mt-6 flex-row gap-2">
              {[
                { id: "price", label: "Lowest price" },
                { id: "distance", label: "Closest" },
                { id: "rating", label: "Top rated" },
              ].map((opt) => {
                const active = sortBy === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    onPress={() => {
                      hapticTap("light");
                      setSortBy(opt.id as "price" | "distance" | "rating");
                    }}
                    className={
                      active
                        ? "px-4 py-1.5 rounded-full bg-espresso"
                        : "px-4 py-1.5 rounded-full border border-linen"
                    }
                  >
                    <Text
                      className={
                        active
                          ? "text-[11px] tracking-cap uppercase text-bone font-sans"
                          : "text-[11px] tracking-cap uppercase text-walnut font-sans"
                      }
                    >
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}
        </View>

        {view === "map" ? (
          <View className="w-full max-w-2xl self-center mb-8">
            <QuotesMap
              quotes={sortedQuotes}
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
            sortedQuotes.map((q) => (
              <QuoteCard key={q.id} q={q} demo={!request} />
            ))
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
            ● Lowest guide price
          </Text>
        </View>
      </ScrollView>
      {/* Hide the bottom tab bar in demo mode — the demo is a focused
          "here's how a quote arrives" walk-through, not the signed-in
          patient surface. No Home / New quote / Bookings tabs needed. */}
      {request ? <PatientTabBar /> : null}
    </SafeAreaView>
  );
}
