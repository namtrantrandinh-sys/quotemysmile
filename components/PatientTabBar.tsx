import { useState } from "react";
import { View, Text, Pressable, type LayoutChangeEvent } from "react-native";
import { useRouter, usePathname } from "expo-router";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  RadialGradient,
  Rect,
} from "react-native-svg";
import { SketchIcon, type SketchIconName } from "@/components/SketchIcon";

/**
 * Bottom tab bar with a true SVG-carved notch cradling the floating
 * camera button. Gradient is multi-stop mint-to-deep-teal, halo is a
 * soft radial glow that emits warmth without overpowering the icon.
 */
type SideTab = {
  key: "home" | "inbox";
  label: string;
  icon: SketchIconName;
  href: string;
};

const SIDE_TABS: SideTab[] = [
  {
    key: "home",
    label: "Home",
    icon: "home",
    href: "/",
  },
  {
    key: "inbox",
    label: "Bookings",
    icon: "bookings",
    href: "/inbox",
  },
];

const CAPTURE_HREF = "/categories";

// Bar geometry
const BAR_HEIGHT = 78;
// Notch radius is now button radius + an explicit cushion so there's a
// visible mint ring between the button edge and the carved bar — the
// button reads as "floating inside" the ditch, not stuck to its walls.
const BUTTON_SIZE = 60;
const NOTCH_CUSHION = 10; // visible breathing room on each side of the button
const NOTCH_RADIUS = BUTTON_SIZE / 2 + NOTCH_CUSHION;
const BAR_RADIUS = 32;

function buildBarPath(width: number) {
  // Returns an SVG path that draws the bar:
  //   • rounded outer corners (BAR_RADIUS)
  //   • a concave notch centred on top to cradle the camera button.
  // Uses arc + bezier so the notch lip eases into the top edge instead of
  // forming sharp corners.
  const cx = width / 2;
  const notchHalf = NOTCH_RADIUS;
  const lipDepth = 22; // how deep the notch carves into the bar
  const lipFlare = 16; // horizontal flare on each side of the notch
  const leftLipX = cx - notchHalf - lipFlare;
  const rightLipX = cx + notchHalf + lipFlare;

  // M start at top-left after corner
  return [
    `M ${BAR_RADIUS} 0`,
    `H ${leftLipX}`,
    // Left flare easing INTO the notch lip
    `C ${cx - notchHalf - 4} 0, ${cx - notchHalf} 6, ${cx - notchHalf} ${lipDepth / 2.4}`,
    // Concave arc carving down into the notch
    `A ${notchHalf} ${notchHalf} 0 0 0 ${cx + notchHalf} ${lipDepth / 2.4}`,
    // Right flare easing back up to the top edge
    `C ${cx + notchHalf} 6, ${cx + notchHalf + 4} 0, ${rightLipX} 0`,
    `H ${width - BAR_RADIUS}`,
    // Top-right corner
    `Q ${width} 0, ${width} ${BAR_RADIUS}`,
    // Right edge
    `V ${BAR_HEIGHT - BAR_RADIUS}`,
    // Bottom-right corner
    `Q ${width} ${BAR_HEIGHT}, ${width - BAR_RADIUS} ${BAR_HEIGHT}`,
    // Bottom edge
    `H ${BAR_RADIUS}`,
    // Bottom-left corner
    `Q 0 ${BAR_HEIGHT}, 0 ${BAR_HEIGHT - BAR_RADIUS}`,
    // Left edge
    `V ${BAR_RADIUS}`,
    // Top-left corner
    `Q 0 0, ${BAR_RADIUS} 0`,
    `Z`,
  ].join(" ");
}

export function PatientTabBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [barWidth, setBarWidth] = useState(0);

  const onBarLayout = (e: LayoutChangeEvent) => {
    setBarWidth(e.nativeEvent.layout.width);
  };

  const activeKey: "home" | "inbox" | "new" | null =
    pathname === "/" || pathname === ""
      ? "home"
      : pathname.startsWith("/inbox") || pathname.startsWith("/booking")
        ? "inbox"
        : pathname.startsWith("/categories") ||
            pathname.startsWith("/capture") ||
            pathname.startsWith("/symptoms") ||
            pathname.startsWith("/location") ||
            pathname.startsWith("/urgency")
          ? "new"
          : null;

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "relative",
        paddingHorizontal: 14,
        paddingTop: 30,
        paddingBottom: 16,
      }}
    >
      {/* ============================================================
          BAR — SVG so the notch is a real concave carve, not an overlay
         ============================================================ */}
      <View
        onLayout={onBarLayout}
        style={{
          height: BAR_HEIGHT,
          shadowColor: "#1F4F47",
          shadowOpacity: 0.22,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 12,
        }}
      >
        {barWidth > 0 ? (
          <Svg
            width={barWidth}
            height={BAR_HEIGHT}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <Defs>
              {/* Refined three-stop mint gradient — pale mint top-left
                  fading through brand mint to deep teal bottom-right.
                  Less flat than a 2-stop, more aesthetic depth. */}
              <SvgLinearGradient id="barFill" x1="0" y1="0" x2="1" y2="1">
                <Stop offset="0" stopColor="#A3D4C6" stopOpacity="1" />
                <Stop offset="0.45" stopColor="#6EB3A4" stopOpacity="1" />
                <Stop offset="1" stopColor="#3F7E73" stopOpacity="1" />
              </SvgLinearGradient>
              {/* Top-edge highlight — sells the curved-glass look */}
              <SvgLinearGradient id="topGloss" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.32" />
                <Stop offset="0.4" stopColor="#FFFFFF" stopOpacity="0" />
              </SvgLinearGradient>
            </Defs>

            {/* Main shape with carved notch */}
            <Path d={buildBarPath(barWidth)} fill="url(#barFill)" />
            {/* Top-edge gloss layered on top of the fill */}
            <Path d={buildBarPath(barWidth)} fill="url(#topGloss)" />
          </Svg>
        ) : null}
      </View>

      {/* Side icons row — sits absolutely positioned over the SVG bar */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 14,
          right: 14,
          top: 30,
          height: BAR_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 28,
        }}
      >
        <SideButton
          tab={SIDE_TABS[0]}
          active={activeKey === "home"}
          onPress={() => router.push(SIDE_TABS[0].href as never)}
        />
        <View style={{ width: 88 }} />
        <SideButton
          tab={SIDE_TABS[1]}
          active={activeKey === "inbox"}
          onPress={() => router.push(SIDE_TABS[1].href as never)}
        />
      </View>

      {/* ============================================================
          FLOATING CAMERA BUTTON — sits inside the carved notch with a
          clear gap to the socket walls so it reads as "floating in the
          ditch" rather than welded into it. Just above the socket rim.
         ============================================================ */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: 6,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        {/* Subtle radial halo — soft mint warmth around the floating button */}
        <Svg
          width={120}
          height={120}
          style={{ position: "absolute", top: -8 }}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#7EC2B2" stopOpacity="0.55" />
              <Stop offset="0.55" stopColor="#7EC2B2" stopOpacity="0.18" />
              <Stop offset="1" stopColor="#7EC2B2" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="140" height="140" fill="url(#halo)" />
        </Svg>

        {/* The camera button itself — sits INSIDE the socket with a
            visible cushion around it (NOTCH_CUSHION = 10px on each side)
            so it reads as floating in the ditch. Strong drop shadow
            sells the hover above the socket floor. */}
        <Pressable
          onPress={() => router.push(CAPTURE_HREF as never)}
          style={{
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            borderRadius: BUTTON_SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#1F4F47",
            shadowOpacity: 0.55,
            shadowRadius: 18,
            shadowOffset: { width: 0, height: 10 },
            elevation: 16,
            // Sits a few px below the top so it tucks INTO the socket
            // but a clear gap of mint shows around all sides.
            marginTop: 8,
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.88)",
            overflow: "hidden",
          }}
        >
          {/* Button surface — its own mini gradient for liveliness */}
          <Svg
            width={BUTTON_SIZE}
            height={BUTTON_SIZE}
            style={{ position: "absolute", top: 0, left: 0 }}
          >
            <Defs>
              <SvgLinearGradient id="btnFill" x1="0" y1="0" x2="0.5" y2="1">
                <Stop offset="0" stopColor="#8BCDBE" />
                <Stop offset="1" stopColor="#4E9388" />
              </SvgLinearGradient>
            </Defs>
            <Rect
              x="0"
              y="0"
              width={BUTTON_SIZE}
              height={BUTTON_SIZE}
              rx={BUTTON_SIZE / 2}
              fill="url(#btnFill)"
            />
          </Svg>
          {/* Top highlight bubble */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 5,
              left: 9,
              right: 9,
              height: 9,
              borderRadius: 9,
              backgroundColor: "rgba(255,255,255,0.32)",
            }}
          />
          <SketchIcon name="camera" size={26} color="#FFFFFF" noGhost />
        </Pressable>

        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 9,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: "#FFFFFF",
            marginTop: 14,
            fontWeight: "600",
          }}
        >
          New quote
        </Text>
      </View>
    </View>
  );
}

function SideButton({
  tab,
  active,
  onPress,
}: {
  tab: SideTab;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{ alignItems: "center", paddingHorizontal: 6, paddingVertical: 2 }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? "rgba(255,255,255,0.28)" : "transparent",
        }}
      >
        <SketchIcon
          name={tab.icon}
          size={23}
          color="#FFFFFF"
          strokeWidth={active ? 1.7 : 1.3}
          noGhost
        />
      </View>
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 9,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: active ? "#FFFFFF" : "rgba(255,255,255,0.78)",
          marginTop: 2,
        }}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}
