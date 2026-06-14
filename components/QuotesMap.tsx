import { useMemo, useRef, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import MapView, {
  Marker,
  Circle,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from "react-native-maps";
import type { Quote } from "@/lib/types";

// Switch to Google Maps when the platform key is present. This unlocks
// up-to-date business listings, buildings, and POIs on iOS too.
const GOOGLE_KEY_PRESENT = Platform.select({
  ios: !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY_IOS,
  android: !!process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY_ANDROID,
  default: false,
});
const PROVIDER = GOOGLE_KEY_PRESENT ? PROVIDER_GOOGLE : PROVIDER_DEFAULT;

type Props = {
  quotes: Quote[];
  patient: { lat: number; lng: number };
  radiusKm?: number;
  onQuoteSelect?: (q: Quote) => void;
};

/**
 * Editorial map view — patient gold pin in centre, dentist clinic pins
 * with price labels, radius ring overlay.
 *
 * On iOS we use Apple Maps (no API key). On Android, default provider
 * (Google) needs the API key set in app.json → android.config.googleMaps.
 */
export function QuotesMap({ quotes, patient, radiusKm = 10, onQuoteSelect }: Props) {
  const mapRef = useRef<MapView | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(
    quotes.find((q) => q.isLowest)?.id ?? quotes[0]?.id ?? null,
  );
  const [zoomDelta, setZoomDelta] = useState(0.04);

  const region: Region = useMemo(() => {
    const all = [patient, ...quotes.filter((q) => q.lat != null && q.lng != null).map((q) => ({ lat: q.lat!, lng: q.lng! }))];
    const lats = all.map((p) => p.lat);
    const lngs = all.map((p) => p.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const padding = 0.012;
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.02, maxLat - minLat + padding * 2),
      longitudeDelta: Math.max(0.02, maxLng - minLng + padding * 2),
    };
  }, [patient, quotes]);

  /**
   * Lightweight grid clustering. Buckets dentist pins onto a grid sized by
   * the current zoom delta so neighbouring clinics merge into a single
   * "+N" plaque when the user is zoomed out. Tap a cluster → zoom in.
   * No external dependency — keeps the bundle slim.
   */
  type Pin =
    | { kind: "single"; quote: Quote }
    | {
        kind: "cluster";
        lat: number;
        lng: number;
        members: Quote[];
        lowest: Quote;
      };

  const pins: Pin[] = useMemo(() => {
    const placed = quotes.filter((q) => q.lat != null && q.lng != null);
    if (placed.length <= 1 || zoomDelta < 0.012) {
      return placed.map((q) => ({ kind: "single", quote: q }));
    }
    // Cell size scales with zoom — ~10 cells across the viewport
    const cellLat = zoomDelta / 10;
    const cellLng = zoomDelta / 10;
    const buckets = new Map<string, Quote[]>();
    for (const q of placed) {
      const i = Math.floor(q.lat! / cellLat);
      const j = Math.floor(q.lng! / cellLng);
      const key = `${i}:${j}`;
      const arr = buckets.get(key) ?? [];
      arr.push(q);
      buckets.set(key, arr);
    }
    const out: Pin[] = [];
    for (const arr of buckets.values()) {
      if (arr.length === 1) {
        out.push({ kind: "single", quote: arr[0] });
      } else {
        const lat = arr.reduce((s, q) => s + (q.lat ?? 0), 0) / arr.length;
        const lng = arr.reduce((s, q) => s + (q.lng ?? 0), 0) / arr.length;
        const lowest = arr.reduce((m, q) => (q.total < m.total ? q : m), arr[0]);
        out.push({ kind: "cluster", lat, lng, members: arr, lowest });
      }
    }
    return out;
  }, [quotes, zoomDelta]);

  const select = (q: Quote) => {
    setSelectedId(q.id);
    if (q.lat != null && q.lng != null) {
      mapRef.current?.animateToRegion(
        {
          latitude: q.lat,
          longitude: q.lng,
          latitudeDelta: region.latitudeDelta * 0.6,
          longitudeDelta: region.longitudeDelta * 0.6,
        },
        420,
      );
    }
    onQuoteSelect?.(q);
  };

  const selected = quotes.find((q) => q.id === selectedId) ?? null;

  return (
    <View className="bg-bone">
      <View style={{ height: 460 }} className="overflow-hidden">
        <MapView
          ref={mapRef}
          provider={PROVIDER}
          style={{ flex: 1 }}
          initialRegion={region}
          showsUserLocation
          showsMyLocationButton
          showsPointsOfInterests={true}
          showsCompass={false}
          showsScale={false}
          showsBuildings={true}
          showsIndoors={false}
          showsTraffic={false}
          rotateEnabled={false}
          pitchEnabled={false}
          mapPadding={{ top: 40, right: 16, bottom: 16, left: 16 }}
          loadingEnabled
          loadingBackgroundColor="#F5F1E8"
          onRegionChangeComplete={(r) => setZoomDelta(r.latitudeDelta)}
        >
          {/* Search radius ring */}
          <Circle
            center={{ latitude: patient.lat, longitude: patient.lng }}
            radius={radiusKm * 1000}
            strokeColor="rgba(201, 169, 97, 0.5)"
            fillColor="rgba(201, 169, 97, 0.08)"
            strokeWidth={1}
          />

          {/* Patient pin — gold dot */}
          <Marker
            coordinate={{ latitude: patient.lat, longitude: patient.lng }}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="items-center">
              <View className="h-4 w-4 rounded-full bg-gold border-4 border-bone" />
              <Text className="mt-1 text-[9px] tracking-cap uppercase text-walnut font-sans">
                You
              </Text>
            </View>
          </Marker>

          {/* Dentist pins — single price plaques + clusters */}
          {pins.map((pin) => {
            if (pin.kind === "cluster") {
              const lowest = pin.lowest;
              return (
                <Marker
                  key={`cluster:${pin.lat.toFixed(5)}:${pin.lng.toFixed(5)}`}
                  coordinate={{ latitude: pin.lat, longitude: pin.lng }}
                  anchor={{ x: 0.5, y: 0.5 }}
                  onPress={() => {
                    mapRef.current?.animateToRegion(
                      {
                        latitude: pin.lat,
                        longitude: pin.lng,
                        latitudeDelta: Math.max(0.012, zoomDelta * 0.45),
                        longitudeDelta: Math.max(0.012, zoomDelta * 0.45),
                      },
                      450,
                    );
                  }}
                >
                  <View className="items-center">
                    <View className="bg-bone border-2 border-gold px-3 py-2 rounded-full flex-row items-baseline gap-1">
                      <Text className="font-display text-sm text-gold">
                        ${lowest.total}+
                      </Text>
                      <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
                        ·{pin.members.length}
                      </Text>
                    </View>
                  </View>
                </Marker>
              );
            }
            const q = pin.quote;
            const isSel = q.id === selectedId;
            const tone = q.isLowest
              ? "bg-gold"
              : q.isFinal
                ? "bg-walnut"
                : "bg-espresso";
            return (
              <Marker
                key={q.id}
                coordinate={{ latitude: q.lat!, longitude: q.lng! }}
                anchor={{ x: 0.5, y: 1 }}
                onPress={() => select(q)}
              >
                <View className="items-center">
                  <View
                    className={`${tone} px-3 py-1.5 ${isSel ? "border-2 border-bone" : ""}`}
                    style={{ borderRadius: 2 }}
                  >
                    <Text
                      className={`font-display text-base ${q.isLowest ? "text-espresso" : "text-bone"}`}
                      style={{ lineHeight: 18 }}
                    >
                      ${q.total}
                    </Text>
                  </View>
                  <View
                    className={tone}
                    style={{
                      width: 0,
                      height: 0,
                      borderLeftWidth: 6,
                      borderRightWidth: 6,
                      borderTopWidth: 8,
                      borderLeftColor: "transparent",
                      borderRightColor: "transparent",
                      borderTopColor: q.isLowest
                        ? "#A9CFC0"
                        : q.isFinal
                          ? "#4D423A"
                          : "#2A2520",
                    }}
                  />
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* Legend */}
        <View className="absolute top-4 left-4 bg-bone border border-linen px-3 py-2">
          <View className="flex-row items-center gap-2 mb-1">
            <View className="h-2 w-2 rounded-full bg-gold" />
            <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
              You
            </Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className="h-2 w-2 bg-gold" />
            <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
              Lowest indicative
            </Text>
          </View>
        </View>
      </View>

      {/* Selected quote summary */}
      {selected ? (
        <Pressable
          onPress={() => onQuoteSelect?.(selected)}
          className="border-b border-linen px-6 py-5 bg-eggshell/40"
        >
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
              {selected.clinicName} · {selected.suburb}
            </Text>
            <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
              {selected.distanceKm.toFixed(1)} km
            </Text>
          </View>
          <View className="flex-row items-baseline justify-between mt-1">
            <View>
              <Text className="font-display text-2xl text-walnut">
                {selected.dentistName}
              </Text>
              <Text className="text-xs text-taupe font-sans mt-0.5">
                {selected.availability}
              </Text>
            </View>
            <Text className="font-display text-4xl text-gold">${selected.total}</Text>
          </View>
        </Pressable>
      ) : null}
    </View>
  );
}
