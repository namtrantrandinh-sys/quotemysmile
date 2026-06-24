import { useEffect, useState } from "react";
import { View, Text } from "react-native";

/**
 * Live ticking countdown to a request/quote `closes_at` ISO timestamp.
 *
 *  - Ticks every 15s (cheap; the user only ever sees minute-level resolution).
 *  - Colour-codes by remaining window:
 *      < 15 min  → clay (urgent)
 *      < 1 hour  → gold
 *      otherwise → walnut
 *  - Renders "Closed" once we cross the deadline, so the patient
 *    immediately understands the request is no longer accepting quotes.
 *
 * Intentionally framework-light: no animation libs, no expensive
 * re-rendering. Drop it into list cards and detail screens without
 * worrying about jank on low-end phones.
 */
export function ExpiryCountdown({
  closesAt,
  size = "md",
  prefix = "Closes in",
  closedLabel = "Closed",
}: {
  closesAt: string | null | undefined;
  size?: "sm" | "md" | "lg";
  prefix?: string;
  closedLabel?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!closesAt) return;
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, [closesAt]);

  if (!closesAt) return null;
  const target = new Date(closesAt).getTime();
  if (Number.isNaN(target)) return null;
  const msLeft = target - now;

  if (msLeft <= 0) {
    return (
      <Text
        className={`font-sans tracking-cap uppercase text-clay ${
          size === "lg" ? "text-sm" : size === "sm" ? "text-[10px]" : "text-xs"
        }`}
      >
        {closedLabel}
      </Text>
    );
  }

  const minutes = Math.floor(msLeft / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let body: string;
  if (days >= 1) {
    body = `${days}d ${hours % 24}h`;
  } else if (hours >= 1) {
    body = `${hours}h ${minutes % 60}m`;
  } else {
    body = `${minutes}m`;
  }

  const tone =
    minutes < 15 ? "text-clay" : minutes < 60 ? "text-gold" : "text-walnut";

  const sizeCls =
    size === "lg" ? "text-sm" : size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <View className="flex-row items-baseline gap-1.5">
      <Text className={`font-sans tracking-cap uppercase ${tone} ${sizeCls}`}>
        {prefix}
      </Text>
      <Text className={`font-display ${tone} ${size === "lg" ? "text-lg" : "text-base"}`}>
        {body}
      </Text>
    </View>
  );
}
