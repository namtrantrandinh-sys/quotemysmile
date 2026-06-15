import { View, Text, Pressable } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";

/**
 * Liquid-glass bottom tab bar — mint tinted, frosted-blur background,
 * floating raised camera button in the centre with a soft mint halo.
 *
 * Reference: iOS-style "liquid glass" / Control Centre treatment, brand
 * recoloured to mint.
 */
type SideTab = {
  key: "home" | "inbox";
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  iconActive: keyof typeof MaterialCommunityIcons.glyphMap;
  href: string;
};

const SIDE_TABS: SideTab[] = [
  {
    key: "home",
    label: "Home",
    icon: "home-outline",
    iconActive: "home",
    href: "/",
  },
  {
    key: "inbox",
    label: "Bookings",
    icon: "calendar-blank-outline",
    iconActive: "calendar-blank",
    href: "/inbox",
  },
];

const CAPTURE_HREF = "/categories";

const MINT = "#5FA89B";
const MINT_DEEP = "#4A8C82";

export function PatientTabBar() {
  const router = useRouter();
  const pathname = usePathname();

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
        paddingHorizontal: 18,
        paddingTop: 26,
        paddingBottom: 18,
      }}
    >
      {/* ============================================================
          LIQUID-GLASS BAR
          BlurView gives real iOS frosted-glass; we overlay it with a
          translucent mint tint + a soft inner highlight at the top edge
          to simulate the liquid-glass curvature.
         ============================================================ */}
      <View
        style={{
          borderRadius: 38,
          overflow: "hidden",
          shadowColor: MINT_DEEP,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
          elevation: 10,
        }}
      >
        <BlurView
          tint="light"
          intensity={70}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 28,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "rgba(95, 168, 155, 0.62)",
          }}
        >
          {/* Top inner highlight — the bright sliver across the curve top
              that sells the glass look. */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: 24,
              right: 24,
              height: 1.5,
              backgroundColor: "rgba(255,255,255,0.55)",
              borderRadius: 1,
            }}
          />
          {/* Subtle lower shade so the bar feels rounded, not flat */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 22,
              backgroundColor: "rgba(74, 140, 130, 0.15)",
            }}
          />

          {/* LEFT — Home */}
          <SideButton
            tab={SIDE_TABS[0]}
            active={activeKey === "home"}
            onPress={() => router.push(SIDE_TABS[0].href as never)}
          />

          {/* Spacer for the floating camera button above */}
          <View style={{ width: 76 }} />

          {/* RIGHT — Bookings */}
          <SideButton
            tab={SIDE_TABS[1]}
            active={activeKey === "inbox"}
            onPress={() => router.push(SIDE_TABS[1].href as never)}
          />
        </BlurView>
      </View>

      {/* ============================================================
          FLOATING CAMERA BUTTON with mint glow halo
         ============================================================ */}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: -10,
          left: 0,
          right: 0,
          alignItems: "center",
        }}
      >
        {/* Outer glow */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 104,
            height: 104,
            borderRadius: 52,
            backgroundColor: "rgba(95, 168, 155, 0.18)",
            top: -10,
          }}
        />
        {/* Inner glow */}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            width: 84,
            height: 84,
            borderRadius: 42,
            backgroundColor: "rgba(95, 168, 155, 0.34)",
            top: 0,
          }}
        />

        {/* The actual camera button — mint with a glassy highlight ring */}
        <Pressable
          onPress={() => router.push(CAPTURE_HREF as never)}
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            alignItems: "center",
            justifyContent: "center",
            shadowColor: MINT_DEEP,
            shadowOpacity: 0.6,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 14,
            marginTop: 10,
            overflow: "hidden",
            backgroundColor: MINT,
            borderWidth: 3,
            borderColor: "rgba(255,255,255,0.85)",
          }}
        >
          {/* Glassy top highlight on the button itself */}
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 3,
              left: 6,
              right: 6,
              height: 12,
              borderRadius: 12,
              backgroundColor: "rgba(255,255,255,0.32)",
            }}
          />
          <MaterialCommunityIcons
            name={activeKey === "new" ? "camera" : "camera-outline"}
            size={28}
            color="#FFFFFF"
          />
        </Pressable>

        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 9,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: MINT,
            marginTop: 6,
            fontWeight: "500",
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
      style={{ alignItems: "center", paddingHorizontal: 8, paddingVertical: 2 }}
    >
      <View
        style={{
          width: 46,
          height: 46,
          borderRadius: 23,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: active ? "rgba(255,255,255,0.28)" : "transparent",
          overflow: "hidden",
        }}
      >
        {active ? (
          // Inner highlight ring on active to feel pressed-in but glassy
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 2,
              left: 8,
              right: 8,
              height: 8,
              borderRadius: 8,
              backgroundColor: "rgba(255,255,255,0.45)",
            }}
          />
        ) : null}
        <MaterialCommunityIcons
          name={active ? tab.iconActive : tab.icon}
          size={24}
          color="#FFFFFF"
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
