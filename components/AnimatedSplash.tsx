import { useEffect, useRef } from "react";
import { Animated, View, Text } from "react-native";

type Props = {
  onDone: () => void;
};

/**
 * Editorial splash overlay shown after expo-splash-screen hides.
 * Cream background, gold wordmark fades in + scales, sub-tagline ticker, fade out.
 *
 * Total duration ~1.6s. Designed to feel intentional, not stalled.
 */
export function AnimatedSplash({ onDone }: Props) {
  const fade = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const tagOpacity = useRef(new Animated.Value(0)).current;
  // Container starts at 0 and fades IN, then later fades OUT — so the
  // transition from native splash to animated splash is seamless (cream
  // background continuous, no flash).
  const containerFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      // Container in — fades up FROM the native splash (continuous cream bg)
      Animated.timing(containerFade, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      // Wordmark in — slower, more deliberate
      Animated.parallel([
        Animated.timing(fade, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
      // Short pause so the wordmark gets to settle before tagline appears
      Animated.delay(250),
      // Tagline in — graceful
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      // Hold — long enough to actually read "Your dream smile, in your hand."
      Animated.delay(2400),
      // Container out — leisurely fade
      Animated.timing(containerFade, {
        toValue: 0,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDone();
    });
  }, [fade, scale, tagOpacity, containerFade, onDone]);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "#F5F1E8",
        alignItems: "center",
        justifyContent: "center",
        opacity: containerFade,
        zIndex: 1000,
      }}
    >
      <Animated.View
        style={{
          opacity: fade,
          transform: [{ scale }],
          alignItems: "center",
        }}
      >
        {/* Top kicker — tiny dotted lockup, fashion-house feel */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            marginBottom: 22,
          }}
        >
          <View style={{ width: 16, height: 1, backgroundColor: "#A9CFC0" }} />
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 9,
              letterSpacing: 4,
              textTransform: "uppercase",
              color: "#8A7E70",
            }}
          >
            est. 2026 · au
          </Text>
          <View style={{ width: 16, height: 1, backgroundColor: "#A9CFC0" }} />
        </View>

        {/* Stacked QUOTE / my / SMILE — Italiana editorial caps + Allura script */}
        <Text
          style={{
            fontFamily: "Italiana",
            fontSize: 64,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#2A2520",
            lineHeight: 66,
          }}
        >
          QUOTE
        </Text>
        <Text
          style={{
            fontFamily: "Allura",
            fontSize: 108,
            color: "#A9CFC0",
            lineHeight: 108,
            marginVertical: -22,
            transform: [{ rotate: "-6deg" }],
          }}
        >
          my
        </Text>
        <Text
          style={{
            fontFamily: "Italiana",
            fontSize: 64,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#2A2520",
            lineHeight: 66,
          }}
        >
          SMILE
        </Text>

        {/* Bottom rule */}
        <View
          style={{
            width: 36,
            height: 1,
            backgroundColor: "#A9CFC0",
            marginTop: 24,
            marginBottom: 16,
          }}
        />
      </Animated.View>

      <Animated.View
        style={{
          opacity: tagOpacity,
          alignItems: "center",
        }}
      >
        <Text
          style={{
            fontFamily: "Italiana",
            fontSize: 24,
            color: "#4D423A",
            textAlign: "center",
            lineHeight: 26,
            marginBottom: 4,
          }}
        >
          Your dream smile,
        </Text>
        <Text
          style={{
            fontFamily: "Allura",
            fontSize: 36,
            color: "#A9CFC0",
            textAlign: "center",
            marginBottom: 18,
            transform: [{ rotate: "-3deg" }],
          }}
        >
          in your hand.
        </Text>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 10,
            letterSpacing: 3.2,
            textTransform: "uppercase",
            color: "#8A7E70",
            textAlign: "center",
            lineHeight: 17,
          }}
        >
          Compare live dental quotes{"\n"}& choose the best on your screen.
        </Text>
      </Animated.View>
    </Animated.View>
  );
}
