import { View, Text, Pressable, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import { Disclaimer } from "./Disclaimer";
import { Icon } from "./Icon";
import { SketchIcon } from "./SketchIcon";
import type { Quote } from "@/lib/types";

const AHPRA_REGISTER_URL = "https://www.ahpra.gov.au/registration/registers-of-practitioners.aspx";

export function QuoteCard({ q, urgency }: { q: Quote; urgency?: "emergency" }) {
  const router = useRouter();

  const openAhpraRegister = () => {
    Alert.alert(
      "Verify on AHPRA",
      `${q.dentistName} is registered with AHPRA as ${q.ahpraNo}. Tap "View" to open the public AHPRA register and confirm.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "View", onPress: () => Linking.openURL(AHPRA_REGISTER_URL) },
      ],
    );
  };

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

      {/* Dentist name */}
      <Text className="text-center font-display text-xl text-walnut mb-1">
        {q.dentistName}
      </Text>
      <Text className="text-center text-[11px] tracking-cap uppercase text-taupe font-sans mb-4">
        {q.suburb}
      </Text>

      {/* AHPRA verification — tappable trust artefact */}
      <View className="items-center mb-8">
        <Pressable
          onPress={openAhpraRegister}
          accessibilityRole="button"
          accessibilityLabel={`AHPRA registered — tap to verify ${q.ahpraNo} on the public register`}
          hitSlop={8}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 11,
            paddingVertical: 5,
            borderRadius: 999,
            backgroundColor: "rgba(95,168,155,0.10)",
            borderWidth: 1,
            borderColor: "rgba(95,168,155,0.32)",
          }}
        >
          <SketchIcon name="verified" size={14} color="#3F7E73" noGhost />
          <Text
            style={{
              fontSize: 10,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#3F7E73",
              fontFamily: "Inter-Medium",
            }}
          >
            AHPRA-Registered · Tap to verify
          </Text>
        </Pressable>
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
                color: "#3F7E73",
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

      {/* Actions */}
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
            color: "#3F7E73",
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
