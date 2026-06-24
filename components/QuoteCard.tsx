import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Disclaimer } from "./Disclaimer";
import { Icon } from "./Icon";
import { SketchIcon } from "./SketchIcon";
import type { Quote } from "@/lib/types";

export function QuoteCard({
  q,
  urgency,
  demo = false,
}: {
  q: Quote;
  urgency?: "emergency";
  /**
   * Demo mode (e.g. the "Live demo" link from the welcome screen). Strips
   * out the booking + breakdown CTAs since the demo is meant to show how
   * a quote looks and how the GPS broadcast works — not walk the user
   * through booking a real dentist.
   */
  demo?: boolean;
}) {
  const router = useRouter();

  return (
    <View className="py-10 border-b border-linen">
      {urgency === "emergency" ? (
        <View className="flex-row items-center justify-center gap-2 mb-4">
          <Icon name="emergency" size={14} color="#9E5E47" />
          <Text className="text-[10px] tracking-editorial uppercase text-clay font-sans">
            Emergency response · premium quote
          </Text>
        </View>
      ) : null}

      {/* Top meta row */}
      <View className="flex-row items-center justify-between mb-5 px-2">
        <View className="flex-row items-center gap-3">
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans">
            {q.clinicName}
          </Text>
          {q.justIn && (
            <Text className="text-[10px] tracking-editorial uppercase text-gold font-sans">
              · Just in
            </Text>
          )}
          {q.isFinal && (
            <Text className="text-[10px] tracking-editorial uppercase text-walnut font-sans">
              · Final
            </Text>
          )}
        </View>
        <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans">
          Replied {q.availability !== "—" ? "now" : "2 hr"}
        </Text>
      </View>

      {/* Provider avatar — Zocdoc-style initials circle.
          We don't yet store dentist photos, so an editorial monogram is
          the most trust-building treatment available. Sits centred above
          the name so the reader's eye lands on a "person" first. */}
      <View className="items-center mb-3">
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: "#F5F1E8",
            borderWidth: 1.5,
            borderColor: "rgba(95,168,155,0.45)",
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#2E7268",
            shadowOpacity: 0.10,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
          }}
        >
          <Text
            style={{
              fontFamily: "CormorantGaramond-Medium",
              fontSize: 26,
              color: "#2E7268",
              letterSpacing: -0.3,
            }}
          >
            {q.dentistName
              .replace(/^Dr\s+/i, "")
              .split(/\s+/)
              .filter(Boolean)
              .map((w) => w[0]?.toUpperCase() ?? "")
              .slice(0, 2)
              .join("")}
          </Text>
        </View>
      </View>

      {/* Dentist name */}
      <Text className="text-center font-display text-xl text-walnut mb-1">
        {q.dentistName}
      </Text>
      <Text className="text-center text-[11px] tracking-cap uppercase text-taupe font-sans mb-4">
        {q.suburb}
      </Text>

      {/* AHPRA trust artefact — display-only, no "tap to verify" CTA.
          QMS verifies every dentist before they can quote, so the patient
          doesn't need to chase down the register themselves. */}
      <View className="items-center mb-8">
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 8,
            minHeight: 32,
            borderRadius: 999,
            backgroundColor: "rgba(95,168,155,0.10)",
            borderWidth: 1,
            borderColor: "rgba(95,168,155,0.32)",
          }}
        >
          <SketchIcon name="verified" size={14} color="#2E7268" noGhost />
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#2E7268",
              fontFamily: "Inter-Medium",
            }}
          >
            AHPRA-registered dentist
          </Text>
        </View>
      </View>

      {/* The hero — price */}
      <View className="items-center mb-6">
        <View className="flex-row items-end gap-3">
          <Text className="font-display text-7xl text-gold leading-none">
            ${q.total}
          </Text>
          {q.isLowest && <View className="h-2 w-2 rounded-full bg-gold mb-3" />}
        </View>
        {q.previousTotal && (
          <Text className="mt-2 text-[11px] tracking-cap uppercase text-taupe font-sans">
            Requoted from ${q.previousTotal}
          </Text>
        )}
      </View>

      {/* Personal note from the dentist — THE killer feature */}
      {q.note ? (
        <View
          style={{
            marginHorizontal: 8,
            marginBottom: 24,
            paddingTop: 18,
            paddingBottom: 18,
            paddingLeft: 20,
            paddingRight: 18,
            borderLeftWidth: 2,
            borderLeftColor: "#5FA89B",
            backgroundColor: "rgba(95,168,155,0.05)",
            borderTopRightRadius: 4,
            borderBottomRightRadius: 4,
          }}
        >
          {/* Opening quote glyph */}
          <Text
            style={{
              position: "absolute",
              top: -2,
              left: 6,
              fontSize: 44,
              lineHeight: 44,
              color: "#A3D4C6",
              fontFamily: "PlayfairDisplay",
              opacity: 0.7,
            }}
          >
            “
          </Text>
          <Text
            numberOfLines={4}
            style={{
              fontFamily: "Lora-MediumItalic",
              fontSize: 14.5,
              lineHeight: 22,
              color: "#4D423A",
              fontStyle: "italic",
            }}
          >
            {q.note}
          </Text>
          <Pressable
            onPress={() => router.push({ pathname: "/quote/[id]", params: { id: q.id } })}
            hitSlop={6}
            style={{ marginTop: 10 }}
          >
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                color: "#2E7268",
                fontFamily: "Inter-Medium",
              }}
            >
              Read full note →
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="mb-8">
          <Disclaimer variant="short" />
        </View>
      )}

      {/* Meta */}
      <View className="flex-row items-center justify-center gap-4 mb-6">
        <Text className="text-xs text-walnut font-sans">
          {q.distanceKm.toFixed(1)} km
        </Text>
        <Text className="text-sand">·</Text>
        <Text className="text-xs text-walnut font-sans">{q.availability}</Text>
        <Text className="text-sand">·</Text>
        <Text className="text-xs text-walnut font-sans">
          ★ {q.rating.toFixed(1)}{" "}
          <Text className="text-taupe">({q.reviewCount})</Text>
        </Text>
      </View>

      {/* Actions — booking + breakdown only shown for real quotes.
          In demo mode (welcome-screen "Live demo" link) we hide them so
          the demo stays focused on "here's how a quote looks + how it
          arrives" rather than walking through a real booking. */}
      {!demo ? (
        <View className="flex-row items-center justify-center gap-4 mb-6">
          <Pressable onPress={() => router.push({ pathname: "/quote/[id]", params: { id: q.id } })}>
            <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans border-b border-walnut/40 pb-1">
              View breakdown
            </Text>
          </Pressable>
          <Text className="text-sand">·</Text>
          <Pressable onPress={() => router.push({ pathname: "/book", params: { id: q.id } })}>
            <Text className="text-[11px] tracking-cap uppercase text-espresso font-sans border-b border-gold pb-1">
              Book consult →
            </Text>
          </Pressable>
        </View>
      ) : (
        <View className="items-center mb-6">
          <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
            Sample quote · sign up to send your photos
          </Text>
        </View>
      )}

      {/* Reassurance strip — "You only pay if you attend" */}
      <View
        style={{
          marginTop: 8,
          paddingTop: 14,
          borderTopWidth: 1,
          borderTopColor: "rgba(229,220,200,0.7)",
          borderStyle: "dashed",
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "Caveat",
            fontSize: 18,
            color: "#2E7268",
            lineHeight: 22,
          }}
        >
          You only pay if you attend.
        </Text>
        <Text
          style={{
            marginTop: 2,
            fontSize: 9,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: "#8A7E70",
            fontFamily: "Inter",
          }}
        >
          Free cancellation until 48 hrs before
        </Text>
      </View>
    </View>
  );
}
