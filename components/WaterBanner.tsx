import { useEffect, useRef } from "react";
import { Animated, View, Text, Pressable, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  caption?: string;
  onBack?: () => void;
};

/**
 * Top banner with a slowly-flowing crystal-water aesthetic.
 *
 *   • Base: aqua-cyan gradient (crystal clear water tone)
 *   • Layer 1: bright horizontal shimmer drifting left-right (slow)
 *   • Layer 2: counter-drifting cool-teal tint (creates the "flow")
 *   • Layer 3: vertical cascade — soft white caustics descending
 *   • Layer 4: secondary vertical caustic at offset phase
 *   • BlurView overlay: opaque frosted-glass crystal texture on top
 *
 * White back chevron sits flush over the moving water.
 */
export function WaterBanner({ caption, onBack }: Props) {
  const router = useRouter();
  const horiz1 = useRef(new Animated.Value(0)).current;
  const horiz2 = useRef(new Animated.Value(0)).current;
  const cascade1 = useRef(new Animated.Value(0)).current;
  const cascade2 = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (val: Animated.Value, ms: number, delay = 0) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
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

    // Cascade is uni-directional (water flows DOWN, doesn't bounce back).
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

    const animations = [
      loop(horiz1, 7000),
      loop(horiz2, 9500, 600),
      cascadeLoop(cascade1, 8000),
      cascadeLoop(cascade2, 11000, 2200),
      loop(shimmer, 4200, 1000),
    ];
    animations.forEach((a) => a.start());
    return () => {
      animations.forEach((a) => a.stop());
    };
  }, [horiz1, horiz2, cascade1, cascade2, shimmer]);

  const tx1 = horiz1.interpolate({ inputRange: [0, 1], outputRange: [-50, 50] });
  const tx2 = horiz2.interpolate({ inputRange: [0, 1], outputRange: [60, -60] });
  // Caustics descend from above the banner to below (off-screen → off-screen)
  const ty1 = cascade1.interpolate({ inputRange: [0, 1], outputRange: [-220, 220] });
  const ty2 = cascade2.interpolate({ inputRange: [0, 1], outputRange: [-260, 260] });
  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <View
      style={{
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#3F7E73", // safety colour so banner is never transparent
      }}
    >
      {/* ============================================================
          BASE — crystal-water gradient. Slightly cooler than the brand
          mint (touch of cyan) to read as flowing water rather than just
          a tint. Fully opaque.
         ============================================================ */}
      <LinearGradient
        colors={[
          "#DCF2EA",
          "#A8DCCB",
          "#6CBAA8",
          "#3F8C82",
          "#2D6E66",
          "#1F4F47",
        ]}
        locations={[0, 0.18, 0.42, 0.7, 0.88, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      {/* Sun-glint highlight stripe near the top of the banner */}
      <LinearGradient
        colors={[
          "rgba(255,255,255,0.55)",
          "rgba(255,255,255,0.10)",
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
          height: 40,
        }}
      />

      {/* Horizontal shimmer band 1 — bright, slow */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -30,
          left: -60,
          right: -60,
          bottom: -30,
          transform: [{ translateX: tx1 }],
        }}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.20)",
            "rgba(255,255,255,0.42)",
            "rgba(255,255,255,0.20)",
            "rgba(255,255,255,0)",
          ]}
          start={{ x: 0, y: 0.3 }}
          end={{ x: 1, y: 0.7 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Horizontal cool-teal current 2 — counter-drift */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -20,
          left: -70,
          right: -70,
          bottom: -20,
          transform: [{ translateX: tx2 }],
        }}
      >
        <LinearGradient
          colors={[
            "rgba(63,140,130,0)",
            "rgba(63,140,130,0.30)",
            "rgba(45,110,102,0.40)",
            "rgba(63,140,130,0.30)",
            "rgba(63,140,130,0)",
          ]}
          start={{ x: 0, y: 0.55 }}
          end={{ x: 1, y: 0.45 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Cascade caustic 1 — vertical descending water highlight */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 180,
          transform: [{ translateY: ty1 }],
          opacity: 0.55,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.32)",
            "rgba(255,255,255,0)",
          ]}
          start={{ x: 0.3, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Cascade caustic 2 — second descending wave, offset phase */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 220,
          transform: [{ translateY: ty2 }],
          opacity: 0.40,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(191,229,218,0)",
            "rgba(255,255,255,0.28)",
            "rgba(191,229,218,0)",
          ]}
          start={{ x: 0.8, y: 0 }}
          end={{ x: 0.2, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Pulsing surface shimmer — gentle brightness throb */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: shimmerOpacity,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.18)",
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.06)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Opaque frosted-glass crystal overlay. Higher intensity so the
          surface reads as crystal water seen through glass — not just a
          tint. iOS native blur, full opacity. */}
      <BlurView
        tint="light"
        intensity={28}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
      />

      {/* Foreground — back chevron + optional caption */}
      <SafeAreaView edges={["top"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: 18,
            paddingTop: 18,
            paddingBottom: 56,
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
              backgroundColor: "rgba(255,255,255,0.22)",
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
                textShadowColor: "rgba(0,40,35,0.35)",
                textShadowRadius: 4,
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
