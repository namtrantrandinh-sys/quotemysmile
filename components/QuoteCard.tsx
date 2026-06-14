import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Disclaimer } from "./Disclaimer";
import { Icon } from "./Icon";
import type { Quote } from "@/lib/types";

export function QuoteCard({ q, urgency }: { q: Quote; urgency?: "emergency" }) {
  const router = useRouter();
  return (
    <View className="py-12 border-b border-linen">
      {urgency === "emergency" ? (
        <View className="flex-row items-center justify-center gap-2 mb-4">
          <Icon name="emergency" size={14} color="#9E5E47" />
          <Text className="text-[10px] tracking-editorial uppercase text-clay font-sans">
            Emergency response · premium quote
          </Text>
        </View>
      ) : null}

      {/* Top meta row */}
      <View className="flex-row items-center justify-between mb-6 px-2">
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
          AHPRA {q.ahpraNo.slice(-4)}
        </Text>
      </View>

      {/* Dentist name */}
      <Text className="text-center font-display text-xl text-walnut mb-1">
        {q.dentistName}
      </Text>
      <Text className="text-center text-[11px] tracking-cap uppercase text-taupe font-sans mb-10">
        {q.suburb}
      </Text>

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

      {/* Disclaimer */}
      <View className="mb-8">
        <Disclaimer variant="short" />
      </View>

      {/* Meta */}
      <View className="flex-row items-center justify-center gap-4 mb-8">
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
      <View className="flex-row items-center justify-center gap-4">
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
    </View>
  );
}
