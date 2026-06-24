import { useEffect, useState } from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SketchIcon } from "@/components/SketchIcon";
import { quoteCountForRequest } from "@/lib/services/requests";

/**
 * Quip-rescue "hero status card" — surfaces the patient's *open* quote
 * request as a single big card at the top of the home tab. Replaces the
 * thin "Activity" row that used to live there.
 *
 * Composition (Quip + Tend):
 *   • Cream surface with a soft mint top-corner glow
 *   • Cormorant headline + Inter caption (matches QMS post-sign-in stack)
 *   • Countdown (closes_at − now) in the deep-teal "forest" token
 *   • Live quote count fetched on mount; ticks every 30s while open
 *   • Whole card is pressable → routes to the live feed for this request
 *
 * Intentionally NO destructive controls on the card itself — the user
 * cancels from the live feed once they're in it.
 */
type ActiveRequest = {
  id: string;
  category: string;
  status: string;
  opens_at: string;
  closes_at: string;
};

function formatCountdown(closesAt: string): { label: string; urgent: boolean } {
  const remaining = new Date(closesAt).getTime() - Date.now();
  if (remaining <= 0) return { label: "Closed — review your quotes", urgent: false };
  const mins = Math.floor(remaining / 60_000);
  if (mins < 60) return { label: `${mins} min remaining`, urgent: mins <= 15 };
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return { label: `${hrs}h ${mins % 60}m remaining`, urgent: false };
  const days = Math.floor(hrs / 24);
  return { label: `${days}d ${hrs % 24}h remaining`, urgent: false };
}

function prettyCategory(c: string): string {
  // "broken-tooth" → "Broken tooth"
  const s = c.replace(/[-_]/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function HeroStatusCard({
  request,
  onPress,
}: {
  request: ActiveRequest;
  onPress: () => void;
}) {
  const [count, setCount] = useState<number>(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    quoteCountForRequest(request.id).then((n) => {
      if (alive) setCount(n);
    });
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      quoteCountForRequest(request.id).then((n) => {
        if (alive) setCount(n);
      });
    }, 30_000);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [request.id]);

  // Countdown re-derives every render; tick state forces a re-render
  // each interval so the minute label stays fresh without setState
  // on every tick (we only setCount when it changes).
  void tick;
  const { label: countdownLabel, urgent } = formatCountdown(request.closes_at);

  return (
    <Pressable onPress={onPress} style={{ width: "100%" }}>
      <View
        style={{
          borderRadius: 20,
          overflow: "hidden",
          backgroundColor: "#FFFFFF",
          shadowColor: "#2E7268",
          shadowOpacity: 0.10,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 4,
          borderWidth: 1,
          borderColor: "rgba(95,168,155,0.20)",
        }}
      >
        {/* Top-corner mint glow — Tend Dental "warm clinical" tile */}
        <LinearGradient
          colors={["rgba(168,220,203,0.55)", "rgba(200,232,220,0.18)", "rgba(255,255,255,0)"]}
          locations={[0, 0.5, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 110,
          }}
        />
        <View style={{ padding: 22 }}>
          {/* Top row — kicker + live dot */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 14,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 10,
                letterSpacing: 1.8,
                textTransform: "uppercase",
                color: "#2E7268",
                fontWeight: "600",
              }}
            >
              Your open request
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: "rgba(95,168,155,0.14)",
              }}
            >
              <View
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: "#2E7268",
                }}
              />
              <Text
                style={{
                  fontFamily: "Inter-Medium",
                  fontSize: 9,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "#2E7268",
                }}
              >
                Live
              </Text>
            </View>
          </View>

          {/* Headline — Cormorant editorial serif */}
          <Text
            style={{
              fontFamily: "CormorantGaramond_400Regular",
              fontSize: 30,
              lineHeight: 34,
              color: "#2A2520",
              letterSpacing: -0.4,
              marginBottom: 4,
            }}
          >
            {prettyCategory(request.category)}
          </Text>

          {/* Sub — quote count + countdown */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 16,
              marginTop: 8,
              marginBottom: 18,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <SketchIcon name="tooth" size={14} color="#2E7268" strokeWidth={1.6} noGhost />
              <Text
                style={{
                  fontFamily: "Inter-Medium",
                  fontSize: 13,
                  color: "#2A2520",
                  letterSpacing: 0.1,
                }}
              >
                {count === 0
                  ? "Waiting for dentists"
                  : count === 1
                    ? "1 dentist quoted"
                    : `${count} dentists quoted`}
              </Text>
            </View>
            <View
              style={{
                width: 1,
                height: 14,
                backgroundColor: "rgba(138,126,112,0.30)",
              }}
            />
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <SketchIcon
                name="sparkle"
                size={13}
                color={urgent ? "#9E5E47" : "#8A7E70"}
                strokeWidth={1.6}
                noGhost
              />
              <Text
                style={{
                  fontFamily: "Inter-Medium",
                  fontSize: 12,
                  color: urgent ? "#9E5E47" : "#6E6457",
                  letterSpacing: 0.1,
                }}
              >
                {countdownLabel}
              </Text>
            </View>
          </View>

          {/* Footer — call to action chevron */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: 14,
              borderTopWidth: 1,
              borderTopColor: "rgba(229,220,200,0.7)",
            }}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 11,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                color: "#2E7268",
                fontWeight: "600",
              }}
            >
              Open live feed
            </Text>
            <SketchIcon name="chevron-right" size={16} color="#2E7268" strokeWidth={1.6} noGhost />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
