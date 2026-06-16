import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Animated } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
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
    setDataLoading(true);
    Promise.all([
      listMyActiveRequests().then((d) => setActive(d as ActiveRequest[])).catch(() => {}),
      listMyBookings().then((d) => setBookings(d as unknown as Booking[])).catch(() => {}),
    ]).finally(() => setDataLoading(false));
  }, [signedIn]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#8BC4B2" }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Animated.View style={{ opacity: headerOpacity }}>
          <View className="px-8 py-6 flex-row items-center justify-between border-b border-linen">
            <Wordmark size="md" />
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push("/live")}
                className="px-3.5 py-1.5 rounded-full bg-white/25 active:bg-white/40"
              >
                <Text className="text-[11px] tracking-cap uppercase text-espresso font-sans">
                  Live demo
                </Text>
              </Pressable>
              {signedIn ? (
                <Pressable
                  onPress={() => router.push("/inbox")}
                  className="px-3.5 py-1.5 rounded-full bg-white/25 active:bg-white/40"
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
          className="flex-1 items-center px-8 py-20"
          style={{ opacity: heroOpacity, transform: [{ translateY: heroY }] }}
        >
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-10 text-center">
            Live dental quotes · Australia
          </Text>

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
              color: "#FFFFFF",
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
            color="#FFFFFF"
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
              color: "#FFFFFF",
              textAlign: "center",
              marginBottom: 16,
              transform: [{ rotate: "-2deg" }],
            }}
          >
            to give you the best quote.
          </Text>

          {/* Role selector — only shown when not signed in */}
          {!signedIn && !loading ? (
            <View className="w-full max-w-md mb-12" style={{ marginTop: 24 }}>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 10,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.85)",
                  textAlign: "center",
                  marginBottom: 18,
                  fontWeight: "500",
                }}
              >
                Choose your path
              </Text>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <ModernRoleTile
                  glyph="account-heart-outline"
                  label="Patient"
                  blurb="Get quotes from nearby dentists in minutes."
                  onPress={() =>
                    router.push({
                      pathname: "/sign-in",
                      params: { role: "patient", mode: "signup" },
                    })
                  }
                />
                <ModernRoleTile
                  glyph="tooth-outline"
                  label="Dentist"
                  blurb="Quote live on patient requests in your area."
                  onPress={() =>
                    router.push({
                      pathname: "/sign-in",
                      params: { role: "dentist", mode: "signup" },
                    })
                  }
                />
              </View>
              <View className="mt-6 items-center">
                <Button
                  variant="secondary"
                  size="md"
                  onPress={() =>
                    router.push({ pathname: "/sign-in", params: { mode: "signin" } })
                  }
                >
                  Sign in
                </Button>
              </View>
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

        {/* Footer */}
        <View className="px-8 py-10 border-t border-linen flex-row items-center justify-between">
          <Wordmark size="sm" />
          <View className="flex-row gap-2">
            {signedIn ? (
              <Pressable
                onPress={() => router.push("/settings")}
                className="px-3 py-1.5 rounded-full bg-white/25 active:bg-white/40"
              >
                <Text className="text-[10px] tracking-editorial uppercase text-espresso font-sans">
                  Settings
                </Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={() => router.push("/legal/terms")}
              className="px-3 py-1.5 rounded-full bg-white/25 active:bg-white/40"
            >
              <Text className="text-[10px] tracking-editorial uppercase text-espresso font-sans">
                Terms
              </Text>
            </Pressable>
            <Pressable
              onPress={() => router.push("/legal/privacy")}
              className="px-3 py-1.5 rounded-full bg-white/25 active:bg-white/40"
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
