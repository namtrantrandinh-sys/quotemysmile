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
            <View className="flex-row items-center gap-6">
              <Pressable onPress={() => router.push("/live")}>
                <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
                  Live demo
                </Text>
              </Pressable>
              {signedIn ? (
                <Pressable onPress={() => router.push("/inbox")}>
                  <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
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

          <Text className="text-base text-walnut font-sans text-center leading-relaxed max-w-md mb-4 px-4">
            No awkward phone calls. No "we'll quote you in person" runaround.
          </Text>
          <Text className="text-base text-walnut font-sans text-center leading-relaxed max-w-md mb-12 px-4">
            Compare live dental quotes & choose the best on your screen — from
            AHPRA-registered dentists near you. Convenient. Competitive. Accurate.
          </Text>

          {/* Role selector — only shown when not signed in */}
          {!signedIn && !loading ? (
            <View className="w-full max-w-md mb-12">
              <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans text-center mb-6">
                Choose your path
              </Text>
              <View className="flex-row gap-3">
                <RoleTile
                  symbol="I"
                  label="Patient"
                  blurb="Get quotes from nearby dentists in minutes."
                  onPress={() =>
                    router.push({
                      pathname: "/sign-in",
                      params: { role: "patient", mode: "signup" },
                    })
                  }
                />
                <RoleTile
                  symbol="II"
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
                  variant="ghost"
                  size="md"
                  onPress={() =>
                    router.push({ pathname: "/sign-in", params: { mode: "signin" } })
                  }
                >
                  I already have an account · Sign in
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
                variant="ghost"
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

          {/* Steps */}
          <View className="w-full max-w-2xl border-t border-linen pt-16 gap-12">
            <Step n="01" title="Photo">
              Guided capture from three angles. The clearer the photo, the more accurate the quote.
            </Step>
            <Step n="02" title="Quote">
              AHPRA-registered dentists nearby send indicative quotes within thirty minutes. Itemised. Transparent.
            </Step>
            <Step n="03" title="Choose">
              Pick the quote that suits. Each one is signed by an AHPRA-registered dentist — in practice, the chairside fee matches your quote.
            </Step>
          </View>
        </Animated.View>

        {/* Footer */}
        <View className="px-8 py-10 border-t border-linen flex-row items-center justify-between">
          <Wordmark size="sm" />
          <View className="flex-row gap-5">
            {signedIn ? (
              <Pressable onPress={() => router.push("/settings")}>
                <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans">
                  Settings
                </Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => router.push("/legal/terms")}>
              <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans">
                Terms
              </Text>
            </Pressable>
            <Pressable onPress={() => router.push("/legal/privacy")}>
              <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans">
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
