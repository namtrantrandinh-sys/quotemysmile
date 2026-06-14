/**
 * useLocation — high-accuracy GPS for QuoteMySmile.
 *
 * Production behaviour:
 *  - Accuracy = HighestForNavigation (sub-5m where the device can deliver)
 *  - Live watch — fires onUpdate as the user moves, until the screen unmounts
 *  - Reverse-geocode suburb/postcode/state on first fix
 *  - Anti-spoof helper isLikelySpoof() compares GPS to IP geo
 *
 * Patient submits the request → we lock the final fix at submit time.
 * Dentist active toggle → we keep a watch open so a fresh fix is always
 * available when a request comes in.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";
import { Platform } from "react-native";

export type LatLng = { lat: number; lng: number };
export type LocationStatus = "idle" | "prompting" | "granted" | "denied" | "error";

export type LocationState = {
  status: LocationStatus;
  coords: LatLng | null;
  suburb: string;
  postcode: string;
  state: string;
  accuracyM: number | null;
  heading: number | null;
  speedMps: number | null;
  fixAt: number | null;
  error?: string;
};

const EMPTY: LocationState = {
  status: "idle",
  coords: null,
  suburb: "",
  postcode: "",
  state: "",
  accuracyM: null,
  heading: null,
  speedMps: null,
  fixAt: null,
};

type Options = {
  auto?: boolean;
  watch?: boolean;
};

export function useLocation(options: Options = {}) {
  const [state, setState] = useState<LocationState>(EMPTY);
  const watchSub = useRef<Location.LocationSubscription | null>(null);
  const lastGeocodeAt = useRef<number>(0);

  const applyFix = useCallback(
    async (loc: Location.LocationObject, skipGeocode = false) => {
      const coords = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      const accuracyM = loc.coords.accuracy ?? null;
      const heading = loc.coords.heading ?? null;
      const speedMps = loc.coords.speed ?? null;

      // Reverse geocode at most once per 30s while watching to save API quota
      let suburb = "";
      let postcode = "";
      let stateCode = "";
      const now = Date.now();
      if (!skipGeocode && now - lastGeocodeAt.current > 30_000) {
        lastGeocodeAt.current = now;
        try {
          const places = await Location.reverseGeocodeAsync({
            latitude: coords.lat,
            longitude: coords.lng,
          });
          const p = places[0];
          if (p) {
            suburb = p.city ?? p.subregion ?? p.district ?? "";
            postcode = p.postalCode ?? "";
            stateCode = p.region ?? "";
          }
        } catch {
          // Offline / quota — coords are still valid
        }
      }

      setState((prev) => ({
        status: "granted",
        coords,
        suburb: suburb || prev.suburb,
        postcode: postcode || prev.postcode,
        state: stateCode || prev.state,
        accuracyM,
        heading,
        speedMps,
        fixAt: now,
      }));
    },
    [],
  );

  const request = useCallback(async () => {
    setState((s) => ({ ...s, status: "prompting" }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setState((s) => ({ ...s, status: "denied" }));
        return;
      }

      // Initial high-accuracy fix
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });
      await applyFix(loc);

      // Optional watch — fires when the user moves > 5 metres
      if (options.watch && !watchSub.current) {
        watchSub.current = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            distanceInterval: 5,
            timeInterval: 4000,
          },
          (l) => void applyFix(l, true),
        );
      }
    } catch (e) {
      setState({
        ...EMPTY,
        status: "error",
        error: e instanceof Error ? e.message : "Unknown location error",
      });
    }
  }, [applyFix, options.watch]);

  useEffect(() => {
    if (options.auto && state.status === "idle") {
      void request();
    }
    return () => {
      if (watchSub.current) {
        watchSub.current.remove();
        watchSub.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.auto]);

  return { ...state, request };
}

/* ---------------------------------------------------------------------- */
/* Geo helpers                                                            */
/* ---------------------------------------------------------------------- */

export function distanceKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export function isLikelySpoof(gps: LatLng, ipGeo: LatLng): boolean {
  return distanceKm(gps, ipGeo) > 50;
}

export function openLocationSettingsHint(): string {
  return Platform.OS === "ios"
    ? "Settings → Privacy & Security → Location Services → QuoteMySmile"
    : "Settings → Apps → QuoteMySmile → Permissions → Location";
}

/**
 * Accuracy tier — used by the location screen to label the GPS fix.
 *  - excellent ≤ 10 m
 *  - good      ≤ 30 m
 *  - poor      > 30 m
 */
export function accuracyTier(m: number | null): "excellent" | "good" | "poor" | "unknown" {
  if (m == null) return "unknown";
  if (m <= 10) return "excellent";
  if (m <= 30) return "good";
  return "poor";
}
