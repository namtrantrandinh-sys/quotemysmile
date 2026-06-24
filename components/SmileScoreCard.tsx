import { useEffect, useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { getMySmileScore, smileScoreBand } from "@/lib/services/smileScore";

/**
 * Compact Smile Score card for the patient home.
 *
 * - When the user has no score yet, prompts them to take the 30-second
 *   quiz (Toothpic-style engagement hook).
 * - Once they have a score, shows the number + band copy. Tapping
 *   re-enters the quiz so they can retake it any time.
 */
export function SmileScoreCard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    getMySmileScore()
      .then((r) => {
        if (mounted) setScore(r.score);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return null;

  if (score == null) {
    return (
      <View
        style={{
          borderRadius: 22,
          // Soft gold-tinged float shadow to echo the START accent.
          shadowColor: "#9E7E3A",
          shadowOpacity: 0.20,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 12 },
          elevation: 8,
        }}
      >
        <Pressable
          onPress={() => router.push("/smile-score")}
          style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
        >
          <View
            style={{
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "rgba(255,255,255,0.45)",
              paddingVertical: 18,
              paddingHorizontal: 20,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              backgroundColor: "rgba(255,255,255,0.05)",
            }}
          >
            <BlurView
              tint="light"
              intensity={Platform.OS === "android" ? 18 : 10}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* Trace cream/gold tint */}
            <LinearGradient
              colors={[
                "rgba(248,232,200,0.07)",
                "rgba(244,226,213,0.04)",
                "rgba(255,255,255,0.02)",
              ]}
              locations={[0, 0.6, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            />
            {/* Specular gleam top-left */}
            <LinearGradient
              colors={["rgba(255,255,255,0.40)", "rgba(255,255,255,0)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 0.7 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              pointerEvents="none"
            />
            {/* Bottom-edge soft reflection */}
            <LinearGradient
              colors={["rgba(158,126,58,0)", "rgba(158,126,58,0.06)"]}
              locations={[0.7, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
              pointerEvents="none"
            />
            {/* Top-edge bevel highlight */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: "rgba(255,255,255,0.85)",
              }}
            />
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text
                style={{
                  fontFamily: "Inter-Medium",
                  fontSize: 10,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  color: "#8A7E70",
                  marginBottom: 4,
                }}
              >
                Quick wellness check · ~45s
              </Text>
              <Text
                style={{
                  fontFamily: "CormorantGaramond-Medium",
                  fontSize: 22,
                  color: "#2A2520",
                  lineHeight: 26,
                }}
              >
                Get your Smile Score
              </Text>
            </View>
            <Text
              style={{
                fontFamily: "Inter-Medium",
                fontSize: 11,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                color: "#C9A961",
              }}
            >
              Start →
            </Text>
          </View>
        </Pressable>
      </View>
    );
  }

  const band = smileScoreBand(score);
  return (
    <View
      style={{
        borderRadius: 22,
        shadowColor: "#1F4F47",
        shadowOpacity: 0.20,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 8,
      }}
    >
      <Pressable
        onPress={() => router.push("/smile-map")}
        style={({ pressed }) => ({ opacity: pressed ? 0.92 : 1 })}
      >
        <View
          style={{
            borderRadius: 22,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.55)",
            paddingVertical: 18,
            paddingHorizontal: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(232,244,239,0.35)",
          }}
        >
          <BlurView
            tint="light"
            intensity={Platform.OS === "android" ? 80 : 55}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            colors={[
              "rgba(168,220,203,0.40)",
              "rgba(232,242,235,0.30)",
              "rgba(248,224,212,0.22)",
            ]}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          />
          <LinearGradient
            colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.7, y: 0.7 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents="none"
          />
          <LinearGradient
            colors={["rgba(31,79,71,0)", "rgba(31,79,71,0.10)"]}
            locations={[0.7, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents="none"
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "rgba(255,255,255,0.85)",
            }}
          />
          <View style={{ flex: 1, paddingRight: 16 }}>
            <Text
              style={{
                fontFamily: "Inter-Medium",
                fontSize: 10,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                color: "#8A7E70",
                marginBottom: 4,
              }}
            >
              Smile Score · {band.label}
            </Text>
            <Text
              style={{
                fontFamily: "CormorantGaramond-Medium",
                fontSize: 14,
                color: "#4D423A",
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              {band.hint}
            </Text>
          </View>
          <Text
            style={{
              fontFamily: "CormorantGaramond-Medium",
              fontSize: 36,
              color: "#C9A961",
            }}
          >
            {score.toFixed(1)}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
