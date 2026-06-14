import { Text, View } from "react-native";

type Size = "sm" | "md" | "lg" | "xl";

/**
 * QMS wordmark — Italiana editorial caps + Allura signature script.
 * Italiana is the high-contrast, fashion-magazine-thin serif that pairs
 * naturally with Allura's flourished script, so the three pieces read as one
 * masthead instead of a novel cover sandwiching a signature.
 */
export function Wordmark({ size = "md" }: { size?: Size }) {
  const base = size === "xl" ? 30 : size === "lg" ? 22 : size === "sm" ? 14 : 17;
  const scriptBoost = base * 1.9;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        gap: 4,
      }}
    >
      <Text
        style={{
          fontFamily: "Italiana",
          fontSize: base,
          lineHeight: base,
          letterSpacing: base * 0.08,
          textTransform: "uppercase",
          color: "#2A2520",
        }}
      >
        Quote
      </Text>
      <Text
        style={{
          fontFamily: "Allura",
          fontSize: scriptBoost,
          lineHeight: scriptBoost,
          color: "#C9A961",
          transform: [{ translateY: 5 }, { rotate: "-3deg" }],
        }}
      >
        my
      </Text>
      <Text
        style={{
          fontFamily: "Italiana",
          fontSize: base,
          lineHeight: base,
          letterSpacing: base * 0.08,
          textTransform: "uppercase",
          color: "#2A2520",
        }}
      >
        Smile
      </Text>
    </View>
  );
}

/**
 * Stacked QUOTE / my / SMILE used in splash + dentist guide header.
 */
export function FullMark({ size = "md" }: { size?: Size }) {
  const cap = size === "xl" ? 64 : size === "lg" ? 44 : size === "sm" ? 22 : 32;
  const script = cap * 1.7;

  return (
    <View style={{ alignItems: "center" }}>
      <Text
        style={{
          fontFamily: "Italiana",
          fontSize: cap,
          letterSpacing: cap * 0.06,
          textTransform: "uppercase",
          color: "#2A2520",
          lineHeight: cap + 2,
        }}
      >
        QUOTE
      </Text>
      <Text
        style={{
          fontFamily: "Allura",
          fontSize: script,
          color: "#C9A961",
          lineHeight: script,
          marginVertical: -cap * 0.32,
          transform: [{ rotate: "-5deg" }],
        }}
      >
        my
      </Text>
      <Text
        style={{
          fontFamily: "Italiana",
          fontSize: cap,
          letterSpacing: cap * 0.06,
          textTransform: "uppercase",
          color: "#2A2520",
          lineHeight: cap + 2,
        }}
      >
        SMILE
      </Text>
    </View>
  );
}
