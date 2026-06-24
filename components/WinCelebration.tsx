import { useEffect, useMemo, useRef } from "react";
import { Modal, View, Text, Pressable, Animated, Easing, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SketchIcon } from "@/components/SketchIcon";
import { notify } from "@/lib/haptics";
import { playWin } from "@/lib/sound";
import { getPrefs } from "@/lib/notificationPrefs";

/**
 * Full-screen celebration moment used on both sides of the booking
 * handshake — the dentist sees it when a quote turns into a booking,
 * the patient sees it the instant their payment confirms.
 *
 * Design rationale: dental marketplace bookings are emotional events.
 * The patient just committed real money to a stranger's chair; the
 * dentist just earned business off a cold lead. Both deserve a moment
 * of "yes — this is good" rather than a quiet status flip. So we
 * stack three feedback channels:
 *   1. Visual — radial mint burst + dotted confetti + serif headline.
 *   2. Sound — three-note ka-ching arpeggio (web today, native after
 *      next dev build with expo-av).
 *   3. Haptic — success notification pattern via expo-haptics.
 *
 * All three are individually mutable via `lib/notificationPrefs` so a
 * dentist with hundreds of bookings/day can keep their phone quiet.
 */
type Props = {
  visible: boolean;
  onClose: () => void;
  /** Headline served above the body copy ("You're booked!"). */
  title: string;
  /** Body — one sentence of context ("Dr Lee will see you Friday…"). */
  body?: string;
  /** Optional CTA label — defaults to "Continue". */
  ctaLabel?: string;
  /** Optional secondary line shown in pill chip above title. */
  kicker?: string;
};

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
// 28 confetti pieces is the sweet spot between "festive" and
// "this app is broken". Each piece gets a deterministic random spec
// so re-renders don't reshuffle — feels stable, not jittery.
const CONFETTI_COUNT = 28;
const CONFETTI_COLORS = [
  "#7BC5B5",
  "#4F9D8E",
  "#2E7268",
  "#C8A75A",
  "#9E5E47",
  "#A8DCCB",
];

type Piece = {
  id: number;
  startX: number;
  driftX: number;
  delay: number;
  size: number;
  color: string;
  rotate: number;
  rectangular: boolean;
};

function makePieces(): Piece[] {
  const out: Piece[] = [];
  for (let i = 0; i < CONFETTI_COUNT; i++) {
    out.push({
      id: i,
      startX: Math.random() * SCREEN_W,
      driftX: (Math.random() - 0.5) * 140,
      delay: Math.random() * 500,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotate: Math.random() * 360,
      rectangular: Math.random() > 0.4,
    });
  }
  return out;
}

export function WinCelebration({
  visible,
  onClose,
  title,
  body,
  ctaLabel = "Continue",
  kicker = "Booked",
}: Props) {
  // Recomputed only when the modal opens — keeps confetti stable while
  // the user is reading, fresh between separate celebrations.
  const pieces = useMemo<Piece[]>(() => (visible ? makePieces() : []), [visible]);
  const burst = useRef(new Animated.Value(0)).current;
  const headlineY = useRef(new Animated.Value(20)).current;
  const headlineOpacity = useRef(new Animated.Value(0)).current;
  const confettiProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      burst.setValue(0);
      headlineY.setValue(20);
      headlineOpacity.setValue(0);
      confettiProgress.setValue(0);
      return;
    }
    // Read prefs at open time so toggling them in Settings takes effect
    // on the *next* celebration without needing a reload.
    void getPrefs().then((prefs) => {
      if (prefs.winHaptic) notify("success");
      if (prefs.winSound) playWin();
    });

    Animated.parallel([
      Animated.timing(burst, {
        toValue: 1,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(headlineY, {
            toValue: 0,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
          Animated.timing(headlineOpacity, {
            toValue: 1,
            duration: 520,
            useNativeDriver: true,
          }),
        ]),
      ]),
      Animated.timing(confettiProgress, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, burst, headlineY, headlineOpacity, confettiProgress]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(31,79,71,0.78)",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 28,
        }}
      >
        {/* Radial mint burst — large soft circle scaling out from
            centre. Sits behind everything to set the celebratory
            backdrop without obscuring the card. */}
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: SCREEN_W * 1.4,
            height: SCREEN_W * 1.4,
            borderRadius: SCREEN_W * 0.7,
            backgroundColor: "rgba(123,197,181,0.35)",
            opacity: burst.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
            transform: [
              {
                scale: burst.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.4, 1],
                }),
              },
            ],
          }}
        />

        {/* Confetti — absolutely positioned dots/rects falling from the
            top with a slight horizontal drift. Each piece resolves its
            own translateY + rotate via the shared confettiProgress. */}
        {pieces.map((p) => (
          <Animated.View
            key={p.id}
            pointerEvents="none"
            style={{
              position: "absolute",
              left: p.startX,
              top: -20,
              width: p.size,
              height: p.rectangular ? p.size * 1.6 : p.size,
              borderRadius: p.rectangular ? 2 : p.size / 2,
              backgroundColor: p.color,
              opacity: confettiProgress.interpolate({
                inputRange: [0, 0.1, 0.85, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateY: confettiProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, SCREEN_H + 80],
                  }),
                },
                {
                  translateX: confettiProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, p.driftX],
                  }),
                },
                {
                  rotate: confettiProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [`${p.rotate}deg`, `${p.rotate + 540}deg`],
                  }),
                },
              ],
            }}
          />
        ))}

        {/* Card */}
        <Animated.View
          style={{
            backgroundColor: "#FFFFFF",
            borderRadius: 28,
            paddingTop: 38,
            paddingBottom: 32,
            paddingHorizontal: 28,
            alignItems: "center",
            width: "100%",
            maxWidth: 360,
            opacity: headlineOpacity,
            transform: [{ translateY: headlineY }],
            shadowColor: "#000",
            shadowOpacity: 0.18,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 12 },
            elevation: 12,
          }}
        >
          {/* Glyph medallion */}
          <View
            style={{
              width: 76,
              height: 76,
              borderRadius: 38,
              overflow: "hidden",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 18,
              shadowColor: "#2E7268",
              shadowOpacity: 0.25,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 6 },
              elevation: 6,
            }}
          >
            <LinearGradient
              colors={["#7BC5B5", "#4F9D8E", "#2E7268"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: "100%",
                height: "100%",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <SketchIcon
                name="sparkle"
                size={38}
                color="#FFFFFF"
                strokeWidth={1.8}
                noGhost
              />
            </LinearGradient>
          </View>

          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 10,
              letterSpacing: 2.6,
              textTransform: "uppercase",
              color: "#2E7268",
              fontWeight: "700",
              marginBottom: 10,
            }}
          >
            ·  {kicker}  ·
          </Text>
          <Text
            style={{
              fontFamily: "CormorantGaramond_700Bold",
              fontSize: 36,
              lineHeight: 40,
              color: "#2A2520",
              letterSpacing: -1.0,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 10,
            }}
          >
            {title}
          </Text>
          {body ? (
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 14,
                lineHeight: 21,
                color: "#6E6457",
                textAlign: "center",
                marginBottom: 26,
              }}
            >
              {body}
            </Text>
          ) : (
            <View style={{ height: 26 }} />
          )}

          <View style={{ alignSelf: "stretch", borderRadius: 14, overflow: "hidden" }}>
            <Pressable
              onPress={onClose}
              style={({ pressed }) => ({ opacity: pressed ? 0.9 : 1 })}
            >
              <LinearGradient
                colors={["#7BC5B5", "#4F9D8E", "#2E7268"]}
                locations={[0, 0.55, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  paddingVertical: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 52,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 14,
                    letterSpacing: 0.6,
                    color: "#FFFFFF",
                    fontWeight: "700",
                    textTransform: "uppercase",
                  }}
                >
                  {ctaLabel}
                </Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
