import { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TextInput, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { listRecentEvents, type EventRow } from "@/lib/services/admin";

/**
 * Admin-only event stream — read-only tail of the `events` audit table.
 * Useful for debugging payments, bookings, AHPRA checks, and pushes in prod.
 */
export default function AdminEventsScreen() {
  const { profile } = useUserProfile();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [type, setType] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = profile?.role === "admin";

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listRecentEvents({
        type: type || undefined,
        bookingId: bookingId || undefined,
        limit: 100,
      });
      setEvents(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of events) map.set(e.type, (map.get(e.type) ?? 0) + 1);
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [events]);

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Admin · events" />
      <ScrollView>
        {!isAdmin ? (
          <View className="px-8 py-16 items-center">
            <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
              Admin only.
            </Text>
          </View>
        ) : (
          <>
            <View className="px-8 pt-8 pb-4">
              <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans mb-3">
                Filter
              </Text>
              <View className="gap-3">
                <TextInput
                  value={type}
                  onChangeText={setType}
                  placeholder="event type (e.g. booking.refund_requested)"
                  placeholderTextColor="#8A7E6F"
                  className="border border-linen bg-eggshell/40 px-4 py-3 font-sans text-sm text-espresso"
                  autoCapitalize="none"
                />
                <TextInput
                  value={bookingId}
                  onChangeText={setBookingId}
                  placeholder="booking_id (full uuid)"
                  placeholderTextColor="#8A7E6F"
                  className="border border-linen bg-eggshell/40 px-4 py-3 font-sans text-sm text-espresso"
                  autoCapitalize="none"
                />
                <Pressable
                  onPress={load}
                  className="bg-espresso py-3 items-center"
                >
                  <Text className="text-[11px] tracking-cap uppercase text-bone font-sans">
                    {loading ? "Loading…" : "Refresh"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Type histogram */}
            <View className="px-8 mb-6">
              <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans mb-3">
                Top types · {events.length} rows
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {grouped.slice(0, 8).map(([t, n]) => (
                  <Pressable
                    key={t}
                    onPress={() => {
                      setType(t);
                      void load();
                    }}
                    className="px-3 py-2 border border-linen bg-eggshell/40"
                  >
                    <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
                      {t} · {n}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Event rows */}
            <View className="px-8 pb-24">
              {events.map((e) => (
                <View
                  key={e.id}
                  className="border border-linen bg-eggshell/40 p-4 mb-3"
                >
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-[10px] tracking-cap uppercase text-gold font-sans">
                      {e.type}
                    </Text>
                    <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
                      {new Date(e.ts).toLocaleTimeString("en-AU", {
                        hour: "numeric",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </Text>
                  </View>
                  <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-2">
                    actor {e.actor_id ? e.actor_id.slice(0, 8) : "system"}
                    {e.request_id ? ` · req ${e.request_id.slice(0, 8)}` : ""}
                  </Text>
                  <Text
                    className="font-sans text-xs text-walnut"
                    style={{ fontFamily: "Inter" }}
                  >
                    {JSON.stringify(e.payload, null, 2)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
