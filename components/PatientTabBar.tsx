import { useState } from "react";
import { View, Text, Pressable, Alert, type LayoutChangeEvent, Platform } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { BlurView } from "expo-blur";
import { signOut } from "@/lib/services/auth";
import Svg, {
  Path,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  RadialGradient,
  Rect,
  Line,
  Polyline,
  Circle,
} from "react-native-svg";
import { SketchIcon } from "@/components/SketchIcon";

/**
 * Bottom tab bar — LIQUID GLASS aesthetic.
 *
 * Switched away from the opaque mint-gradient slab so the bar reads as
 * a translucent floating panel: BlurView underlay (iOS native, RN
 * fallback on Android) + soft white tint + top-edge gloss + hairline
 * white border. The SVG-carved notch and floating camera button are
 * retained because they're the strongest brand cue in the patient UI.
 *
 * Layout was also rebuilt: previously the side icons used `space-
 * between` around an 88pt invisible spacer, which left an uneven gap
 * pattern (home/inbox bunched tight, bookings/sign-out spread apart).
 * Now the bar is a strict 5-slot grid where every side button is
 * `flex:1` so each icon occupies the same horizontal real-estate and
 * is centred in its own column.
 */
type TabKey = "home" | "inbox" | "bookings" | "sign-out";
type SideTab = {
  key: TabKey;
  label: string;
  href?: string;
  action?: "sign-out";
};

// Minimal stroke icons (custom thin SVG paths) — replaces the chunky
// Ionicons filled glyphs. The premium look is editorial line-art:
// 1.4pt stroke, rounded caps/joins, no fill, just geometry. Active vs
// inactive state cues via color tone + label weight only, not by
// swapping to a filled glyph — the line set should feel coherent.
const LEFT_TABS: SideTab[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "inbox", label: "Inbox", href: "/inbox" },
];

const RIGHT_TABS: SideTab[] = [
  { key: "bookings", label: "Bookings", href: "/bookings" },
  { key: "sign-out", label: "Sign out", action: "sign-out" },
];

/** Minimal 24x24 stroke icon set — premium editorial line-art. */
function TabIcon({ name, color }: { name: TabKey; color: string }) {
  const stroke = color;
  const sw = 1.4;
  switch (name) {
    case "home":
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M3.5 11 12 4l8.5 7"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M5.5 10v9a.5.5 0 0 0 .5.5h12a.5.5 0 0 0 .5-.5v-9"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M10 19.5v-4.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 .5.5v4.5"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case "inbox":
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 5h16a.5.5 0 0 1 .5.5v9a.5.5 0 0 1-.5.5h-9.5L7 18.5V15H4a.5.5 0 0 1-.5-.5v-9A.5.5 0 0 1 4 5Z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="8.5" cy="10" r="0.6" fill={stroke} />
          <Circle cx="12" cy="10" r="0.6" fill={stroke} />
          <Circle cx="15.5" cy="10" r="0.6" fill={stroke} />
        </Svg>
      );
    case "bookings":
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4.5 6h15a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-.5.5h-15a.5.5 0 0 1-.5-.5v-13a.5.5 0 0 1 .5-.5Z"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="4" y1="10" x2="20" y2="10" stroke={stroke} strokeWidth={sw} />
          <Line x1="8" y1="4" x2="8" y2="7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <Line x1="16" y1="4" x2="16" y2="7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        </Svg>
      );
    case "sign-out":
      return (
        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
          <Path
            d="M14 4h4.5a.5.5 0 0 1 .5.5v15a.5.5 0 0 1-.5.5H14"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Line x1="4" y1="12" x2="14" y2="12" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
          <Polyline
            points="10,8 14,12 10,16"
            stroke={stroke}
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      );
  }
}

const CAPTURE_HREF = "/categories";

// Bar geometry — unchanged, the carved-notch socket cradles the camera.
const BAR_HEIGHT = 78;
const BUTTON_SIZE = 60;
const NOTCH_CUSHION = 10;
const NOTCH_RADIUS = BUTTON_SIZE / 2 + NOTCH_CUSHION;
const BAR_RADIUS = 32;
// Width reserved over the notch in the icon row so the two pairs of
// side buttons don't slide under the camera. Matches the visual carve
// width (notch radius + cushion + flare).
const NOTCH_SLOT_WIDTH = (NOTCH_RADIUS + 16) * 2;

function buildBarPath(width: number) {
  const cx = width / 2;
  const notchHalf = NOTCH_RADIUS;
  const lipDepth = 22;
  const lipFlare = 16;
  const leftLipX = cx - notchHalf - lipFlare;
  const rightLipX = cx + notchHalf + lipFlare;
  return [
    `M ${BAR_RADIUS} 0`,
    `H ${leftLipX}`,
    `C ${cx - notchHalf - 4} 0, ${cx - notchHalf} 6, ${cx - notchHalf} ${lipDepth / 2.4}`,
    `A ${notchHalf} ${notchHalf} 0 0 0 ${cx + notchHalf} ${lipDepth / 2.4}`,
    `C ${cx + notchHalf} 6, ${cx + notchHalf + 4} 0, ${rightLipX} 0`,
    `H ${width - BAR_RADIUS}`,
    `Q ${width} 0, ${width} ${BAR_RADIUS}`,
    `V ${BAR_HEIGHT - BAR_RADIUS}`,
    `Q ${width} ${BAR_HEIGHT}, ${width - BAR_RADIUS} ${BAR_HEIGHT}`,
    `H ${BAR_RADIUS}`,
    `Q 0 ${BAR_HEIGHT}, 0 ${BAR_HEIGHT - BAR_RADIUS}`,
    `V ${BAR_RADIUS}`,
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

  const activeKey: TabKey | "new" | null =
    pathname === "/" || pathname === ""
      ? "home"
      : pathname.startsWith("/inbox")
        ? "inbox"
        : pathname.startsWith("/bookings") || pathname.startsWith("/booking")
          ? "bookings"
          : pathname.startsWith("/categories") ||
              pathname.startsWith("/capture") ||
              pathname.startsWith("/symptoms") ||
              pathname.startsWith("/location") ||
              pathname.startsWith("/urgency")
            ? "new"
            : null;

  const handleTabPress = async (tab: SideTab) => {
    if (tab.action === "sign-out") {
      Alert.alert("Sign out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign out",
          style: "destructive",
          onPress: async () => {
            try {
              await signOut();
            } catch {}
            router.replace("/");
          },
        },
      ]);
      return;
    }
    if (tab.href) router.push(tab.href as never);
  };

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
          BAR — liquid-glass panel:
            1. BlurView (native frosted blur) sits at the bottom
            2. SVG with the carved-notch path masks the blur to the
               correct silhouette and paints a translucent white tint
               + top gloss + hairline border on top
         ============================================================ */}
      <View
        onLayout={onBarLayout}
        style={{
          height: BAR_HEIGHT,
          shadowColor: "#1B3A35",
          shadowOpacity: 0.16,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
          elevation: 14,
        }}
      >
        {barWidth > 0 ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: barWidth,
              height: BAR_HEIGHT,
            }}
          >
            {/* Native blur — on iOS this is the real frosted-glass
                effect; Android (where BlurView is best-effort) falls
                back to its experimental impl. The SVG path overlay
                masks the visible silhouette so the blur appears
                confined to the carved-bar shape rather than a rectangle. */}
            <View
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: barWidth,
                height: BAR_HEIGHT,
                borderRadius: BAR_RADIUS,
                overflow: "hidden",
              }}
            >
              <BlurView
                intensity={Platform.OS === "ios" ? 32 : 50}
                tint="light"
                style={{ flex: 1 }}
              />
            </View>

            {/* SVG layer paints the carved-notch silhouette in
                translucent white over the blur. Anywhere the path
                does NOT cover (the notch concavity, the corners
                beyond the radius) is transparent — that's where the
                blur is hidden and the page shows through cleanly. */}
            <Svg
              width={barWidth}
              height={BAR_HEIGHT}
              style={{ position: "absolute", top: 0, left: 0 }}
            >
              <Defs>
                {/* Pure clear-glass tint — no mint cast. User feedback:
                    "take away the teal blur make it look more glassy".
                    Neutral white over the BlurView reads as actual
                    frosted glass instead of tinted plastic. */}
                <SvgLinearGradient id="glassTint" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.34" />
                  <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.22" />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0.28" />
                </SvgLinearGradient>
                {/* Crisp top-edge gloss — sells the glass curvature */}
                <SvgLinearGradient id="topGloss" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.55" />
                  <Stop offset="0.35" stopColor="#FFFFFF" stopOpacity="0" />
                </SvgLinearGradient>
                {/* Inner hairline highlight — like the rim of a glass */}
                <SvgLinearGradient id="rimHighlight" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
                  <Stop offset="0.04" stopColor="#FFFFFF" stopOpacity="0" />
                </SvgLinearGradient>
              </Defs>

              {/* Tint layer */}
              <Path d={buildBarPath(barWidth)} fill="url(#glassTint)" />
              {/* Top gloss */}
              <Path d={buildBarPath(barWidth)} fill="url(#topGloss)" />
              {/* Rim highlight (faint white inner line near the top) */}
              <Path d={buildBarPath(barWidth)} fill="url(#rimHighlight)" />
              {/* Hairline border — defines the glass edge against the
                  page; uses stroke-only so it's a 1px crisp line.
                  Slightly cooler grey rather than pure white so the
                  bar reads as a sealed glass panel, not a paper cut-out. */}
              <Path
                d={buildBarPath(barWidth)}
                fill="none"
                stroke="rgba(255,255,255,0.7)"
                strokeWidth={1}
              />
              <Path
                d={buildBarPath(barWidth)}
                fill="none"
                stroke="rgba(46,114,104,0.10)"
                strokeWidth={0.5}
              />
            </Svg>
          </View>
        ) : null}
      </View>

      {/* Side icons row — strict 5-column flex grid so every side
          button has equal width and is centred in its own column.
          Column layout (left→right):
            [Home][Inbox][notch slot · width=NOTCH_SLOT_WIDTH][Bookings][Sign out]
          Previously this used space-between which made the gaps look
          uneven. */}
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
        }}
      >
        {LEFT_TABS.map((tab) => (
          <View key={tab.key} style={{ flex: 1, alignItems: "center" }}>
            <SideButton
              tab={tab}
              active={activeKey === tab.key}
              onPress={() => handleTabPress(tab)}
            />
          </View>
        ))}
        <View style={{ width: NOTCH_SLOT_WIDTH }} />
        {RIGHT_TABS.map((tab) => (
          <View key={tab.key} style={{ flex: 1, alignItems: "center" }}>
            <SideButton
              tab={tab}
              active={activeKey === tab.key}
              onPress={() => handleTabPress(tab)}
            />
          </View>
        ))}
      </View>

      {/* ============================================================
          FLOATING CAMERA BUTTON — unchanged, this is the brand anchor.
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
        <Svg
          width={120}
          height={120}
          style={{ position: "absolute", top: -8 }}
          pointerEvents="none"
        >
          <Defs>
            <RadialGradient id="halo" cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#7EC2B2" stopOpacity="0.20" />
              <Stop offset="0.55" stopColor="#7EC2B2" stopOpacity="0.06" />
              <Stop offset="1" stopColor="#7EC2B2" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="140" height="140" fill="url(#halo)" />
        </Svg>

        <Pressable
          onPress={() => router.push(CAPTURE_HREF as never)}
          style={{
            width: BUTTON_SIZE,
            height: BUTTON_SIZE,
            borderRadius: BUTTON_SIZE / 2,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: "#2E7268",
            shadowOpacity: 0.22,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 6 },
            elevation: 8,
            marginTop: 8,
            borderWidth: 2,
            borderColor: "rgba(255,255,255,0.88)",
            overflow: "hidden",
          }}
        >
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

        {/* "New quote" label — on liquid glass the old white label
            was invisible against the bone bg; switched to deep teal
            for legibility on the lighter, translucent panel. */}
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 9,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: "#2E7268",
            marginTop: 14,
            fontWeight: "700",
          }}
        >
          New quote
        </Text>
      </View>
    </View>
  );
}

/**
 * Side button — clean Ionicons line glyph + small label. No mint pill,
 * no teal halo: the active state just swaps the outline icon for the
 * filled variant and bumps the label weight. Keeps the bar reading as
 * neutral frosted glass with the camera button as the sole mint
 * accent (per user spec).
 */
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
      hitSlop={6}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
    >
      <View
        style={{
          alignItems: "center",
          paddingHorizontal: 4,
          paddingVertical: 2,
        }}
      >
        <TabIcon
          name={tab.key}
          color={active ? "#1F4F47" : "rgba(31,79,71,0.78)"}
        />
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 9,
            letterSpacing: 0.6,
            color: active ? "#1F4F47" : "rgba(31,79,71,0.70)",
            marginTop: 6,
            fontWeight: active ? "600" : "400",
          }}
        >
          {tab.label}
        </Text>
      </View>
    </Pressable>
  );
}
