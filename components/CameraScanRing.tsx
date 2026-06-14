import { useEffect, useRef } from "react";
import { Animated, View } from "react-native";

type Props = {
  size?: number;
  active?: boolean; // when true, runs the scan loop
};

/**
 * Animated scan ring — fades + rotates a gold arc around an oval to indicate
 * "we're checking your photo positioning". Pure cosmetic but signals progress.
 */
export function CameraScanRing({ size = 280, active = true }: Props) {
  const rotate = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (!active) return;
    const spin = Animated.loop(
      Animated.timing(rotate, {
        toValue: 1,
        duration: 2400,
        useNativeDriver: true,
      }),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ]),
    );
    spin.start();
    pulse.start();
    return () => {
      spin.stop();
      pulse.stop();
    };
  }, [active, rotate, fade]);

  const spinDeg = rotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View
      pointerEvents="none"
      style={{
        width: size,
        height: size * 1.23,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size * 1.23,
          borderRadius: size,
          borderTopWidth: 2,
          borderLeftWidth: 2,
          borderRightWidth: 0,
          borderBottomWidth: 0,
          borderColor: "#C9A961",
          opacity: fade,
          transform: [{ rotate: spinDeg }],
        }}
      />
    </View>
  );
}
