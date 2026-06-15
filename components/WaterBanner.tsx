import { useEffect, useRef } from "react";
import { Animated, View, Text, Pressable, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type Props = {
  /** Optional caption shown on the right (e.g. "Step 02 · Capture"). */
  caption?: string;
  /** Override the back action. Defaults to router.back(). */
  onBack?: () => void;
};

/**
 * Top banner with a slow, continuously-shifting mint-water aesthetic —
 * three stacked animated gradient layers + an iOS BlurView crystal overlay.
 *
 * • White back chevron sits flush over the moving gradient.
 * • Honors safe-area top inset (sits below the Dynamic Island automatically).
 */
export function WaterBanner({ caption, onBack }: Props) {
  const router = useRouter();
  const shimmer1 = useRef(new Animated.Value(0)).current;
  const shimmer2 = useRef(new Animated.Value(0)).current;
  const shimmer3 = useRef(new Animated.Value(0)).current;

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

    // Three different periods so the layers slip past each other and
    // never repeat in lockstep — gives the impression of moving water.
    const a1 = loop(shimmer1, 6000);
    const a2 = loop(shimmer2, 8500, 600);
    const a3 = loop(shimmer3, 11000, 1200);
    a1.start();
    a2.start();
    a3.start();
    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [shimmer1, shimmer2, shimmer3]);

  const tx1 = shimmer1.interpolate({ inputRange: [0, 1], outputRange: [-40, 40] });
  const tx2 = shimmer2.interpolate({ inputRange: [0, 1], outputRange: [50, -50] });
  const tx3 = shimmer3.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });

  return (
    <View
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Base mint gradient — sits on the lowest z-index */}
      <LinearGradient
        colors={["#A9CFC0", "#8BC4B2", "#5FA89B"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />

      {/* Moving water layer 1 — bright shimmer drifting left-right */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -20,
          left: -40,
          right: -40,
          bottom: -20,
          transform: [{ translateX: tx1 }],
        }}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.18)",
            "rgba(255,255,255,0.42)",
            "rgba(255,255,255,0.18)",
            "rgba(255,255,255,0)",
          ]}
          start={{ x: 0, y: 0.2 }}
          end={{ x: 1, y: 0.8 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Moving water layer 2 — counter-drifting cool tint */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -10,
          left: -50,
          right: -50,
          bottom: -10,
          transform: [{ translateX: tx2 }],
        }}
      >
        <LinearGradient
          colors={[
            "rgba(95,168,155,0)",
            "rgba(95,168,155,0.18)",
            "rgba(74,140,130,0.30)",
            "rgba(95,168,155,0.18)",
            "rgba(95,168,155,0)",
          ]}
          start={{ x: 0, y: 0.6 }}
          end={{ x: 1, y: 0.4 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Moving water layer 3 — vertical caustic ripple, slowest */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateX: tx3 }],
          opacity: 0.55,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(255,255,255,0.08)",
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.12)",
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.08)",
          ]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Crystal blur overlay — soft frosted texture on top of the moving
          gradient. Low intensity so the colours still come through. */}
      <BlurView
        tint="light"
        intensity={18}
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
            paddingTop: 10,
            paddingBottom: 18,
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
              backgroundColor: "rgba(255,255,255,0.18)",
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
                opacity: 0.92,
              }}
            >
              {caption}
            </Text>
          ) : (
            <View />
          )}

          {/* Right-side spacer keeps the back chevron flush-left without
              the caption forcing it off-centre. */}
          <View style={{ width: 38 }} />
        </View>
      </SafeAreaView>
    </View>
  );
}
