import { useEffect, useRef } from "react";
import {
  Animated,
  View,
  Text,
  Pressable,
  Easing,
  StyleSheet,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
} from "react-native-svg";

type Props = {
  caption?: string;
  onBack?: () => void;
};

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

/**
 * Hyper-realistic crystal-water banner.
 *
 * Four animated SVG wave layers travelling horizontally at different
 * speeds + amplitudes (sine paths). Layered on a 6-stop water-depth
 * gradient. Sun-glint stripe + caustic vertical highlights cascading
 * downward. iOS BlurView for the crystal-glass surface.
 *
 * All animation is `useNativeDriver: true` (translateX only) so it
 * runs at 60fps even on older devices.
 */
export function WaterBanner({ caption, onBack }: Props) {
  const router = useRouter();
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const wave3 = useRef(new Animated.Value(0)).current;
  const wave4 = useRef(new Animated.Value(0)).current;
  const cascade1 = useRef(new Animated.Value(0)).current;
  const cascade2 = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Wave loops travel left → right continuously. We render two copies
    // of each wave side-by-side inside the SVG so when one shifts
    // off-screen the other seamlessly takes over.
    const horizLoop = (val: Animated.Value, ms: number, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: ms,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      );

    const cascadeLoop = (val: Animated.Value, ms: number, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(val, {
            toValue: 1,
            duration: ms,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      );

    const pulseLoop = (val: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, {
            toValue: 1,
            duration: ms,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(val, {
            toValue: 0,
            duration: ms,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );

    const all = [
      horizLoop(wave1, 9000),
      horizLoop(wave2, 13000, 1500),
      horizLoop(wave3, 17000, 2500),
      horizLoop(wave4, 22000, 3500),
      cascadeLoop(cascade1, 8000),
      cascadeLoop(cascade2, 11000, 2200),
      pulseLoop(shimmer, 4200),
    ];
    all.forEach((a) => a.start());
    return () => {
      all.forEach((a) => a.stop());
    };
  }, [wave1, wave2, wave3, wave4, cascade1, cascade2, shimmer]);

  // SVG wave layer — translate the wave pattern across one full period
  // so the visible portion loops seamlessly. Pattern width = 400, we
  // shift by -200 (one full peak-to-peak) and it lines up cleanly.
  const waveTx = (val: Animated.Value) =>
    val.interpolate({ inputRange: [0, 1], outputRange: [0, -200] });

  const cTy1 = cascade1.interpolate({
    inputRange: [0, 1],
    outputRange: [-260, 280],
  });
  const cTy2 = cascade2.interpolate({
    inputRange: [0, 1],
    outputRange: [-320, 320],
  });
  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.28, 0.58],
  });

  return (
    <View
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#1F4F47",
      }}
    >
      {/* ============================================================
          BASE — 6-stop water-depth gradient (looking INTO water,
          dark surface on top fading to pale shallow at the bottom).
          Cooler hues than brand mint for that crystal-water feel.
         ============================================================ */}
      <LinearGradient
        colors={[
          "#1F4F47", // deep surface
          "#2D6E66",
          "#3F8C82",
          "#6CBAA8",
          "#A8DCCB",
          "#DCF2EA", // sandy shallow
        ]}
        locations={[0, 0.18, 0.42, 0.7, 0.9, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ============================================================
          WAVE LAYERS — animated SVG sine paths drifting left.
          Four overlapping curves with different amplitudes & alphas
          for parallax depth.
         ============================================================ */}
      {[
        { tx: waveTx(wave4), opacity: 0.16, top: 22, color: "#0F3530" },
        { tx: waveTx(wave3), opacity: 0.22, top: 46, color: "#2D6E66" },
        { tx: waveTx(wave2), opacity: 0.32, top: 78, color: "#7BC4B5" },
        { tx: waveTx(wave1), opacity: 0.45, top: 118, color: "#FFFFFF" },
      ].map((w, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: w.top,
            left: 0,
            right: -200, // extra width to cover the seamless wrap
            height: 80,
            transform: [{ translateX: w.tx }],
            opacity: w.opacity,
          }}
        >
          <Svg
            width="500%"
            height="100%"
            viewBox="0 0 800 80"
            preserveAspectRatio="none"
          >
            {/* Sine path repeated four times (period 200) for seamless wrap */}
            <Path
              d="
                M 0 40
                Q 50 8, 100 40 T 200 40 T 300 40 T 400 40 T 500 40 T 600 40 T 700 40 T 800 40
                L 800 80 L 0 80 Z
              "
              fill={w.color}
            />
          </Svg>
        </Animated.View>
      ))}

      {/* ============================================================
          SUN-GLINT TOP STRIPE — bright reflective surface highlight
         ============================================================ */}
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.62)",
          "rgba(255,255,255,0.16)",
          "rgba(255,255,255,0)",
        ]}
        locations={[0, 0.5, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
        }}
      />

      {/* ============================================================
          CASCADE CAUSTICS — vertical light streaks descending
         ============================================================ */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 200,
          transform: [{ translateY: cTy1 }],
          opacity: 0.55,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.36)",
            "rgba(255,255,255,0)",
          ]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 240,
          transform: [{ translateY: cTy2 }],
          opacity: 0.42,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(191,229,218,0)",
            "rgba(255,255,255,0.30)",
            "rgba(191,229,218,0)",
          ]}
          start={{ x: 0.78, y: 0 }}
          end={{ x: 0.22, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* ============================================================
          PULSING SHIMMER — gentle surface brightness throb
         ============================================================ */}
      <Animated.View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          opacity: shimmerOpacity,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.18)",
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.08)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* ============================================================
          CRYSTAL-GLASS frost — iOS native BlurView on top
         ============================================================ */}
      <BlurView tint="light" intensity={22} style={StyleSheet.absoluteFill} />

      {/* ============================================================
          FOREGROUND — back chevron + caption
         ============================================================ */}
      <SafeAreaView edges={["top"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 64,
          }}
        >
          <Pressable
            onPress={onBack ?? (() => router.back())}
            hitSlop={14}
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(255,255,255,0.28)",
            }}
          >
            <MaterialCommunityIcons name="chevron-left" size={24} color="#FFFFFF" />
          </Pressable>

          {caption ? (
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 10,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                color: "#FFFFFF",
                opacity: 0.95,
                textShadowColor: "rgba(0,40,35,0.45)",
                textShadowRadius: 6,
              }}
            >
              {caption}
            </Text>
          ) : (
            <View />
          )}

          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}
