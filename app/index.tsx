import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Animated } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Updates from "expo-updates";
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/Button";
import { RoleTile } from "@/components/RoleTile";
import { Skeleton } from "@/components/Skeleton";
import { PatientTabBar } from "@/components/PatientTabBar";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { listMyActiveRequests } from "@/lib/services/requests";
import { listMyBookings } from "@/lib/services/bookings";
import { signOut } from "@/lib/services/auth";

type ActiveRequest = { id: string; category: string; status: string; opens_at: string; closes_at: string };
type Booking = { id: string; slot: string; status: string };

export default function WelcomeScreen() {
  const router = useRouter();
  const { profile, signedIn, loading } = useUserProfile();
  usePushRegistration();
  const [active, setActive] = useState<ActiveRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  // Surface activity-load failures so the user sees *something* instead
  // of a silent empty-state when the request actually errored. Common
  // cause is a transient network blip during cold-start.
  const [activityError, setActivityError] = useState<string | null>(null);

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(heroOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(heroY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, [headerOpacity, heroOpacity, heroY]);

  useEffect(() => {
    if (!signedIn) {
      setDataLoading(false);
      return;
    }
    // Signed-in dentists must never land on the patient welcome — even
    // when they navigate back from a dentist screen. Otherwise pressing
    // back twice from /dentist/* drops them onto patient hero copy +
    // patient tab bar, which is confusing and looks like a bug.
    if (profile?.role === "dentist") {
      router.replace("/dentist");
      return;
    }
    setDataLoading(true);
    setActivityError(null);
    Promise.all([
      listMyActiveRequests()
        .then((d) => setActive(d as ActiveRequest[]))
        .catch((e: { message?: string }) =>
          setActivityError(e?.message ?? "Couldn't load requests"),
        ),
      listMyBookings()
        .then((d) => setBookings(d as unknown as Booking[]))
        .catch((e: { message?: string }) =>
          setActivityError(e?.message ?? "Couldn't load bookings"),
        ),
    ]).finally(() => setDataLoading(false));
  }, [signedIn, profile?.role, router]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F5F1E8" }}>
      {/* Soft mint band at the very top fades into cream/bone — same
          palette as the categories + capture screens for visual
          consistency across the whole patient flow. */}
      <LinearGradient
        colors={["#A8DCCB", "#C8E8DC", "#E8F2EB", "#F5F1E8", "#F5F1E8"]}
        locations={[0, 0.18, 0.4, 0.7, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Animated.View style={{ opacity: headerOpacity }}>
          <View className="px-8 py-6 flex-row items-center justify-between border-b border-linen">
            <Wordmark size="md" />
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push("/live")}
                className="px-3.5 py-1.5 rounded-full bg-eggshell active:bg-linen border border-linen"
              >
                <Text className="text-[11px] tracking-cap uppercase text-espresso font-sans">
                  Live demo
                </Text>
              </Pressable>
              {signedIn ? (
                <Pressable
                  onPress={() => router.push("/inbox")}
                  className="px-3.5 py-1.5 rounded-full bg-eggshell active:bg-linen border border-linen"
                >
                  <Text className="text-[11px] tracking-cap uppercase text-espresso font-sans">
                    Inbox
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </Animated.View>

        {/* Hero */}
        <Animated.View
          className="flex-1 items-center px-8 pt-10 pb-12"
          style={{ opacity: heroOpacity, transform: [{ translateY: heroY }] }}
        >
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 11,
              letterSpacing: 2.5,
              textTransform: "uppercase",
              color: "#3F7E73",
              textAlign: "center",
              marginBottom: 40,
              fontWeight: "500",
            }}
          >
            Live dental quotes · Australia
          </Text>

          {/* Home + splash share one editorial register: Italiana caps
              + Allura script (the "before" lockup). The new Cormorant
              face is reserved for post-sign-in screens so the marketing
              surface stays on the original brand type. */}
          <Text
            style={{
              fontFamily: "Italiana",
              fontSize: 48,
              lineHeight: 52,
              color: "#2A2520",
              textAlign: "center",
              marginBottom: 2,
            }}
          >
            Your dream smile,
          </Text>
          <Text
            style={{
              fontFamily: "Allura",
              fontSize: 68,
              lineHeight: 72,
              color: "#5FA89B",
              textAlign: "center",
              marginBottom: 24,
            }}
          >
            in your hand.
          </Text>

          {/* Modern tooth-outline icon — premium dental cue above the headline */}
          <MaterialCommunityIcons
            name="tooth-outline"
            size={36}
            color="#5FA89B"
            style={{ marginTop: 24, marginBottom: 16, opacity: 0.92 }}
          />
          <Text
            style={{
              fontFamily: "Italiana",
              fontSize: 22,
              color: "#2A2520",
              textAlign: "center",
              lineHeight: 26,
              marginBottom: 4,
              paddingHorizontal: 16,
            }}
          >
            Dentists compete
          </Text>
          <Text
            style={{
              fontFamily: "Allura",
              fontSize: 38,
              color: "#5FA89B",
              textAlign: "center",
              marginBottom: 16,
            }}
          >
            to give you the best quote.
          </Text>

          {/* Two distinct sign-in entry points — patients book, dentists
              quote. Each tile carries its own brand register: mint pill
              for patient (warm consumer) and deep teal for dentist
              (authoritative practitioner). */}
          {!signedIn && !loading ? (
            <View className="w-full max-w-md mb-12 items-center" style={{ marginTop: 32 }}>
              {/* Two role buttons side-by-side on a single row — compact
                  pill width, just the title (no subtitle) so they fit
                  comfortably on a phone. */}
              <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
                <WelcomeRoleTile
                  role="patient"
                  title="I'm a Patient"
                  icon="account-heart-outline"
                  onPress={() =>
                    router.push({
                      pathname: "/sign-in",
                      params: { role: "patient", mode: "signup" },
                    })
                  }
                />
                <WelcomeRoleTile
                  role="dentist"
                  title="I'm a Dentist"
                  icon="tooth-outline"
                  onPress={() =>
                    router.push({
                      pathname: "/sign-in",
                      params: { role: "dentist", mode: "signup" },
                    })
                  }
                />
              </View>

              <Pressable
                onPress={() =>
                  router.push({ pathname: "/sign-in", params: { mode: "signin" } })
                }
                hitSlop={10}
                style={{ marginTop: 14 }}
              >
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 13,
                    fontWeight: "500",
                    letterSpacing: 0.2,
                    color: "#3F7E73",
                    textAlign: "center",
                  }}
                >
                  Already have an account?{" "}
                  <Text style={{ textDecorationLine: "underline" }}>Sign in</Text>
                </Text>
              </Pressable>
            </View>
          ) : null}

          {/* Signed-in CTAs */}
          {signedIn ? (
            <View className="mb-12 items-center w-full max-w-md">
              <View className="flex-row gap-4 mb-6">
                <Button variant="primary" size="lg" onPress={() => router.push("/categories")}>
                  Get a quote
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onPress={() =>
                    router.push(profile?.role === "dentist" ? "/dentist" : "/inbox")
                  }
                >
                  {profile?.role === "dentist" ? "Open dashboard" : "My inbox"}
                </Button>
              </View>
              <Button
                variant="secondary"
                size="md"
                onPress={async () => {
                  await signOut();
                  router.replace("/");
                }}
              >
                Sign out
              </Button>
            </View>
          ) : null}

          {/* Active state for signed-in */}
          {signedIn ? (
            <View className="w-full max-w-md mb-16 border-t border-linen pt-12">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Activity
              </Text>
              {dataLoading ? (
                <View className="gap-4">
                  <Skeleton height={48} />
                  <Skeleton height={48} />
                </View>
              ) : activityError && active.length === 0 && bookings.length === 0 ? (
                <Text className="text-sm text-clay font-sans text-center">
                  Couldn't load your activity. Pull down to retry.
                </Text>
              ) : active.length === 0 && bookings.length === 0 ? (
                <Text className="text-sm text-taupe font-sans text-center">
                  No active requests. Tap "Get a quote" to start.
                </Text>
              ) : (
                <>
                  {active.map((r) => (
                    <Pressable
                      key={r.id}
                      onPress={() => router.push({ pathname: "/live", params: { request: r.id } })}
                      className="py-4 border-b border-linen flex-row items-center justify-between"
                    >
                      <Text className="font-sans text-sm text-walnut">{r.category}</Text>
                      <Text className="text-[10px] tracking-cap uppercase text-forest font-sans">
                        ● Live →
                      </Text>
                    </Pressable>
                  ))}
                  {bookings.slice(0, 3).map((b) => (
                    <View
                      key={b.id}
                      className="py-4 border-b border-linen flex-row items-center justify-between"
                    >
                      <Text className="font-sans text-sm text-walnut">
                        {new Date(b.slot).toLocaleString("en-AU", {
                          weekday: "short",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </Text>
                      <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
                        {b.status}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          ) : null}

          {/* Steps section removed — flow is now self-explanatory from
              the role tiles and main hero. Less is more. */}
          <View className="w-full max-w-2xl">

          </View>
        </Animated.View>

        {/* Tiny build tag — visible proof of which JS bundle is live on
            the device. If you see "OTA #4 mint-fix", the EAS Update
            applied. If you still see "embedded", the device is running
            the build's bundled JS and OTA hasn't taken yet. */}
        <View style={{ alignItems: "center", marginTop: 4 }}>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 9,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#A89B88",
            }}
          >
            Bundle: OTA #14 backbar-fix ·{" "}
            {Updates.updateId ? Updates.updateId.slice(0, 8) : "embedded"}
          </Text>
        </View>

        {/* Footer */}
        <View className="px-8 py-10 border-t border-linen flex-row items-center justify-between">
          <Wordmark size="sm" />
          <View className="flex-row gap-2">
            {signedIn ? (
              <Pressable
                onPress={() => router.push("/settings")}
                className="px-3 py-1.5 rounded-full bg-eggshell active:bg-linen border border-linen"
              >
                <Text className="text-[10px] tracking-editorial uppercase text-espresso font-sans">
                  Settings
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push("/legal/terms")}
              className="px-3 py-1.5 rounded-full bg-eggshell active:bg-linen border border-linen"
            >
              <Text className="text-[10px] tracking-editorial uppercase text-espresso font-sans">
                Terms
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/legal/privacy")}
              className="px-3 py-1.5 rounded-full bg-eggshell active:bg-linen border border-linen"
            >
              <Text className="text-[10px] tracking-editorial uppercase text-espresso font-sans">
                Privacy
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      {signedIn ? <PatientTabBar /> : null}
    </SafeAreaView>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: string }) {
  return (
    <View>
      <Text className="font-display text-3xl mb-3" style={{ color: "#FFFFFF" }}>{n}</Text>
      <Text className="text-xs tracking-cap uppercase text-walnut font-sans mb-2">{title}</Text>
      <Text className="text-sm text-taupe font-sans leading-relaxed">{children}</Text>
    </View>
  );
}

/**
 * Modern role tile — white surface, soft shadow, mint accent circle,
 * clean Inter typography. Replaces the old Patient/Dentist boxes that
 * were transparent over the mint background.
 */
function ModernRoleTile({
  glyph,
  label,
  blurb,
  onPress,
}: {
  glyph: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  blurb: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        backgroundColor: pressed ? "#F8FAF9" : "#FFFFFF",
        borderRadius: 20,
        paddingVertical: 22,
        paddingHorizontal: 18,
        alignItems: "center",
        shadowColor: "#1F4F47",
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        borderWidth: 1,
        borderColor: "rgba(31,79,71,0.06)",
      })}
    >
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "rgba(95,168,155,0.14)",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 14,
        }}
      >
        <MaterialCommunityIcons name={glyph} size={28} color="#5FA89B" />
      </View>
      <Text
        style={{
          fontFamily: "Inter",
          fontWeight: "600",
          fontSize: 16,
          color: "#2A2520",
          marginBottom: 5,
          letterSpacing: 0.2,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 12,
          color: "#6E6457",
          textAlign: "center",
          lineHeight: 17,
        }}
      >
        {blurb}
      </Text>
    </Pressable>
  );
}

/**
 * WelcomeRoleTile — large tappable card used on the welcome screen.
 * Patient = mint primary; Dentist = deep-teal authoritative. Matches
 * the same tile language used on the sign-in role-picker so the user
 * sees consistent treatment as they move forward.
 */
function WelcomeRoleTile({
  role,
  title,
  icon,
  onPress,
}: {
  role: "patient" | "dentist";
  title: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  onPress: () => void;
}) {
  // Tend Dental tactile card: cream surface, warm hairline border, mint
  // accent for patient / deep-teal for dentist. Centered icon-over-serif
  // label reads like a healthcare brand tile, not a marketing pill.
  // Background sits on a wrapping View — Pressable function-style was
  // intermittently dropping backgroundColor on iOS.
  const isDentist = role === "dentist";
  const accent = isDentist ? "#1F4F47" : "#5FA89B";
  const accentSoft = isDentist ? "rgba(31,79,71,0.10)" : "rgba(95,168,155,0.14)";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(31,79,71,0.10)",
        shadowColor: "#1F4F47",
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 2,
        overflow: "hidden",
      }}
    >
      <Pressable
        onPress={onPress}
        android_ripple={{ color: "rgba(31,79,71,0.06)" }}
        style={({ pressed }) => ({
          paddingVertical: 22,
          paddingHorizontal: 14,
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          backgroundColor: pressed ? "#FAFAF7" : "transparent",
        })}
      >
        <View
          style={{
            width: 52,
            height: 52,
            borderRadius: 26,
            backgroundColor: accentSoft,
            borderWidth: 1,
            borderColor: isDentist ? "rgba(31,79,71,0.18)" : "rgba(95,168,155,0.30)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <MaterialCommunityIcons name={icon} size={28} color={accent} />
        </View>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={{
            fontFamily: "Inter",
            fontWeight: "600",
            fontSize: 15,
            lineHeight: 20,
            color: "#2A2520",
            letterSpacing: 0.1,
            textAlign: "center",
            includeFontPadding: false,
          }}
        >
          {title}
        </Text>
      </Pressable>
    </View>
  );
}
