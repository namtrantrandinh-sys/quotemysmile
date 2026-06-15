import { Image, Text, View } from "react-native";

const SMILE_SOURCE = require("../assets/smile.png");

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
  // Smile underline scales with the wordmark size — small relative to text width.
  const smileWidth = base * 9.5;
  const smileHeight = base * 1.6;

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
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
            color: "#4A8C82",
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
      <Image
        source={SMILE_SOURCE}
        style={{
          width: smileWidth,
          height: smileHeight,
          marginTop: -smileHeight * 0.35,
        }}
        resizeMode="contain"
      />
    </View>
  );
}

/**
 * Stacked QUOTE / my / SMILE used in splash + dentist guide header.
 */
export function FullMark({ size = "md" }: { size?: Size }) {
  const cap = size === "xl" ? 64 : size === "lg" ? 44 : size === "sm" ? 22 : 32;
  const script = cap * 1.7;
  const smileWidth = cap * 4.5;
  const smileHeight = cap * 0.65;

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
          color: "#4A8C82",
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
      <Image
        source={SMILE_SOURCE}
        style={{
          width: smileWidth,
          height: smileHeight,
          marginTop: cap * 0.05,
        }}
        resizeMode="contain"
      />
    </View>
  );
}
