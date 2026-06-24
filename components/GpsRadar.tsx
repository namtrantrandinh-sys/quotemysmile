import React, { useEffect, useMemo, useRef } from "react";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Defs, RadialGradient, Stop, G, Path } from "react-native-svg";

// react-native-svg's typings for `G` don't expose `style`, but the
// runtime accepts an animated transform on the wrapper. Cast through
// `any` so the Animated transform interpolations compile without losing
// runtime behavior.
const AnimatedG = Animated.createAnimatedComponent(G) as unknown as React.ComponentType<
  Omit<React.ComponentProps<typeof G>, "opacity"> & {
    style?: unknown;
    opacity?: unknown;
  }
>;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** Size of the radar square in points. Default 240. */
  size?: number;
  /** Number of dentist pins to drop around the edge. Default 6. */
  pinCount?: number;
  /** Mint colour family — defaults to brand deep-mint. */
  color?: string;
  /** Optional accent for the dentist pins (gold). */
  accent?: string;
  /** Whether to render the rotating sweep sector. Default true. */
  sweep?: boolean;
};

/**
 * GpsRadar — the dopamine moment between "I tapped Send" and "first quote
 * landed". Pure JS Animated + react-native-svg, no native modules.
 *
 * Composition:
 *   • Three concentric rings pulse outward on a staggered loop (radar ping)
 *   • A faint mint wedge rotates 360° forever (classic sweep)
 *   • A centre dot with cream halo represents the patient pin
 *   • Tiny tooth-glyph pins fade in around the perimeter on a timed
 *     sequence, simulating dentists picking up the request
 *
 * The component is purely visual — it does NOT touch GPS. The parent
 * screen owns location state; this is the celebration overlay.
 */
export function GpsRadar({
  size = 240,
  pinCount = 6,
  color = "#2E7268",
  accent = "#C9A961",
  sweep = true,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 6;

  // Three rings, each a separate Animated.Value, staggered by 800ms.
  const ringAnims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const centreAnim = useRef(new Animated.Value(0)).current;

  // Pin positions — fixed angles, evenly spaced with a slight golden-ratio
  // jitter so they don't read as a clock face. Each pin gets its own fade
  // Animated.Value so they can arrive on staggered timing.
  const pins = useMemo(() => {
    const items = [];
    const golden = 137.508; // golden-angle in degrees → organic distribution
    for (let i = 0; i < pinCount; i++) {
      const deg = (i * golden) % 360;
      const rad = (deg * Math.PI) / 180;
      // Push pins to ~78% of max radius — visible, not on the rim
      const r = maxR * 0.78;
      items.push({
        x: cx + Math.cos(rad) * r,
        y: cy + Math.sin(rad) * r,
        fade: new Animated.Value(0),
        delay: 600 + i * 350,
      });
    }
    return items;
  }, [pinCount, cx, cy, maxR]);

  useEffect(() => {
    // Looping ring pulses — each ring runs 2400ms cycle, starts 800ms apart
    const ringLoops = ringAnims.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 800),
          Animated.timing(v, {
            toValue: 1,
            duration: 2400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: false, // svg attrs aren't native-drivable
          }),
          Animated.timing(v, {
            toValue: 0,
            duration: 0,
            useNativeDriver: false,
          }),
        ]),
      ),
    );

    // Sweep — rotates 360° every 3.6s, smooth linear
    const sweepLoop = Animated.loop(
      Animated.timing(sweepAnim, {
        toValue: 1,
        duration: 3600,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    // Centre dot soft breath — 1.0 → 1.18 → 1.0 over 1.8s, loop
    const centreLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(centreAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(centreAnim, {
          toValue: 0,
          duration: 900,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    // Pin fade-in sequence — each pin starts after its `delay` and stays
    // visible. After 8s we reset and replay so the radar keeps feeling
    // alive even if the user lingers.
    const pinAnims = pins.map((p) =>
      Animated.sequence([
        Animated.delay(p.delay),
        Animated.timing(p.fade, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    ringLoops.forEach((l) => l.start());
    sweepLoop.start();
    centreLoop.start();
    Animated.parallel(pinAnims).start();

    return () => {
      ringLoops.forEach((l) => l.stop());
      sweepLoop.stop();
      centreLoop.stop();
      pins.forEach((p) => p.fade.stopAnimation());
    };
  }, [ringAnims, sweepAnim, centreAnim, pins]);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id="bg" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.06" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
          <RadialGradient id="sweep" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.32" />
            <Stop offset="100%" stopColor={color} stopOpacity="0" />
          </RadialGradient>
        </Defs>

        {/* Backdrop disc — quiet mint wash so the rings have something to ride on */}
        <Circle cx={cx} cy={cy} r={maxR} fill="url(#bg)" />

        {/* Static rim + two static range rings — the "grid" of the radar */}
        <Circle cx={cx} cy={cy} r={maxR} stroke={color} strokeOpacity={0.18} strokeWidth={1} fill="none" />
        <Circle cx={cx} cy={cy} r={maxR * 0.66} stroke={color} strokeOpacity={0.12} strokeWidth={1} fill="none" />
        <Circle cx={cx} cy={cy} r={maxR * 0.33} stroke={color} strokeOpacity={0.10} strokeWidth={1} fill="none" />

        {/* Rotating sweep wedge — covers ~60° of the disc */}
        {sweep ? (
          <AnimatedG
            origin={`${cx}, ${cy}`}
            style={{
              transform: [
                {
                  rotate: sweepAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0deg", "360deg"],
                  }),
                },
              ],
            }}
          >
            <Path
              d={describeWedge(cx, cy, maxR, -30, 30)}
              fill="url(#sweep)"
            />
          </AnimatedG>
        ) : null}

        {/* Three pulsing rings — radius grows, opacity fades */}
        {ringAnims.map((v, i) => (
          <AnimatedCircle
            key={i}
            cx={cx}
            cy={cy}
            r={v.interpolate({ inputRange: [0, 1], outputRange: [4, maxR] })}
            stroke={color}
            strokeWidth={1.4}
            fill="none"
            opacity={v.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] })}
          />
        ))}

        {/* Dentist pins — tiny tooth glyphs that fade in */}
        {pins.map((p, i) => (
          <AnimatedG
            key={i}
            opacity={p.fade}
            style={{
              transform: [
                {
                  scale: p.fade.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1],
                  }),
                },
              ],
            }}
          >
            {/* Halo behind the pin so it sits cleanly on the mint backdrop */}
            <Circle cx={p.x} cy={p.y} r={11} fill="#F5F1E8" opacity={0.92} />
            <Circle cx={p.x} cy={p.y} r={11} stroke={accent} strokeOpacity={0.4} strokeWidth={1} fill="none" />
            {/* Tooth dot — kept minimal so it reads at this size */}
            <Circle cx={p.x} cy={p.y} r={3.5} fill={accent} />
          </AnimatedG>
        ))}

        {/* Centre patient pin — pulsing breath halo + solid gold dot */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={18}
          fill={accent}
          opacity={centreAnim.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.36] })}
        />
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={12}
          fill={accent}
          opacity={centreAnim.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.5] })}
        />
        <Circle cx={cx} cy={cy} r={6} fill={accent} />
        <Circle cx={cx} cy={cy} r={2.2} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

/**
 * describeWedge — build an SVG path for a circular wedge centred at (cx,cy)
 * with the given start/end angles in degrees (0° = right, +clockwise).
 */
function describeWedge(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
}
