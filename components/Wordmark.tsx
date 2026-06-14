import { Text, View } from "react-native";

type Size = "sm" | "md" | "lg" | "xl";

/**
 * QMS wordmark — modern luxury register.
 * Inter Light at extreme letter-spacing for QUOTE / SMILE (calm, geometric,
 * Glossier / Aēsop / RMS Beauty palette), with Allura "my" carrying the
 * personality. Reads as a clinical-luxury brand mark, not a book spine.
 */
export function Wordmark({ size = "md" }: { size?: Size }) {
  const base = size === "xl" ? 22 : size === "lg" ? 17 : size === "sm" ? 11 : 14;
  const scriptBoost = base * 2.2;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
      }}
    >
      <Text
        style={{
          fontFamily: "Inter-Light",
          fontSize: base,
          lineHeight: base,
          letterSpacing: base * 0.32,
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
          color: "#A9CFC0",
          marginHorizontal: base * 0.4,
          transform: [{ translateY: 5 }, { rotate: "-2deg" }],
        }}
      >
        my
      </Text>
      <Text
        style={{
          fontFamily: "Inter-Light",
          fontSize: base,
          lineHeight: base,
          letterSpacing: base * 0.32,
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
          color: "#A9CFC0",
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
