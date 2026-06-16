import { useEffect, useRef } from "react";
import {
  Animated,
  View,
  Text,
  Pressable,
  Easing,
  StyleSheet,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";

// Real ocean wave video. On native we use expo-video; on web we fall
// back to a procedural gradient (web preview can't run video reliably
// inside the Metro bundle).
const WATER_VIDEO = require("../assets/video/water.mp4");

type Props = {
  caption?: string;
  onBack?: () => void;
};

/**
 * Hyper-realistic water banner — actual ocean wave footage looping,
 * with a mint-teal tint overlay so it matches brand palette without
 * losing the wave realism. iOS BlurView on top for crystal-glass feel.
 */
export function WaterBanner({ caption, onBack }: Props) {
  const router = useRouter();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 4200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const shimmerOpacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.18, 0.42],
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
          BASE — real ocean wave video on native; gradient on web.
         ============================================================ */}
      {Platform.OS === "web" ? (
        <LinearGradient
          colors={[
            "#1F4F47",
            "#2D6E66",
            "#3F8C82",
            "#6CBAA8",
            "#A8DCCB",
          ]}
          locations={[0, 0.25, 0.55, 0.85, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <NativeWaterVideo />
      )}

      {/* ============================================================
          MINT TINT OVERLAY — pulls the natural blue water toward
          brand mint without losing the wave motion underneath.
         ============================================================ */}
      <View
        pointerEvents="none"
        style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: "rgba(63,140,130,0.42)",
        }}
      />

      {/* ============================================================
          SUN-GLINT TOP STRIPE
         ============================================================ */}
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

      {/* ============================================================
          BOTTOM FADE — softens the video edge into the page below
         ============================================================ */}
      <LinearGradient
        colors={[
          "rgba(31,79,71,0)",
          "rgba(31,79,71,0.28)",
        ]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 36,
        }}
      />

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
            "rgba(255,255,255,0.15)",
            "rgba(255,255,255,0)",
            "rgba(255,255,255,0.05)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Very light BlurView — only on native — to give a tiny bit of
          crystal-glass softness without obscuring the waves. */}
      {Platform.OS !== "web" ? (
        <BlurView tint="light" intensity={8} style={StyleSheet.absoluteFill} />
      ) : null}

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

// ────────────────────────────────────────────────────────────────────
// Native-only video subcomponent. Imported lazily so the web bundle
// doesn't need to resolve expo-video (which has native-only codegen).
// ────────────────────────────────────────────────────────────────────
function NativeWaterVideo() {
  const { VideoView, useVideoPlayer } = require("expo-video") as typeof import("expo-video");
  const player = useVideoPlayer(WATER_VIDEO, (p) => {
    p.loop = true;
    p.muted = true;
    p.playbackRate = 0.8; // slow-mo for that calm ocean feel
    p.play();
  });

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFill}
      contentFit="cover"
      nativeControls={false}
      allowsFullscreen={false}
      allowsPictureInPicture={false}
    />
  );
}
