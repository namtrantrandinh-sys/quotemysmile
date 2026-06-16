import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, View, type LayoutChangeEvent, Easing } from "react-native";
import Svg, { Defs, LinearGradient, Stop, Rect } from "react-native-svg";

const AnimatedSvg = Animated.createAnimatedComponent(Svg);

type Props = {
  children: ReactNode;
  /** Duration of one sweep, ms. */
  duration?: number;
  /** Shine highlight colour. */
  highlight?: string;
  /** How wide the shine band is, in pixels. */
  bandWidth?: number;
  /** Override active state — pause the shimmer if false. */
  active?: boolean;
};

/**
 * Wraps any text/children with a slowly sweeping shine highlight that
 * passes from the left edge across to the right, then loops. The shine
 * sits ON TOP of the children using an absolutely-positioned animated
 * SVG gradient with mix-blend-like alpha (no native blend modes needed).
 */
export function ShimmerText({
  children,
  duration = 2200,
  highlight = "rgba(255,255,255,0.9)",
  bandWidth = 50,
  active = true,
}: Props) {
  const sweep = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!active || width === 0) return;
    sweep.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        // Pause briefly between sweeps so it doesn't feel relentless.
        Animated.delay(600),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [sweep, duration, active, width]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  // Translate the shine band from off-left-edge to off-right-edge.
  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-bandWidth, width],
  });

  return (
    <View onLayout={onLayout} style={{ position: "relative", overflow: "hidden" }}>
      {children}
      {active && width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: bandWidth,
            transform: [{ translateX }],
          }}
        >
          <Svg width={bandWidth} height="100%">
            <Defs>
              <LinearGradient id="shine" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={highlight} stopOpacity="0" />
                <Stop offset="0.5" stopColor={highlight} stopOpacity="1" />
                <Stop offset="1" stopColor={highlight} stopOpacity="0" />
              </LinearGradient>
            </Defs>
            <Rect x="0" y="0" width={bandWidth} height="100%" fill="url(#shine)" />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}
