import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Animated,
  TextInput,
  Keyboard,
  Image,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { SketchIcon, type SketchIconName } from "@/components/SketchIcon";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

const HERO_SMILE = require("@/assets/images/hero-smile.jpg");
// Signed-in patient surface — hand holding a clear orthodontic aligner on
// a calm cream backdrop (Pexels 3845985, 3840x5760). Speaks directly to
// the dental-quote use case and gives the glassy greeting + Smile Score
// cards a real photo to refract through, rather than the flat mint
// gradient. Soft scrim keeps text legible without muting the photo.
const PATIENT_HOME_BG = require("@/assets/images/patient-login-bg.jpg");
import { Wordmark } from "@/components/Wordmark";
import { Button } from "@/components/Button";
import { RoleTile } from "@/components/RoleTile";
import { Skeleton } from "@/components/Skeleton";
import { PatientTabBar } from "@/components/PatientTabBar";
import { HeroStatusCard } from "@/components/HeroStatusCard";
import { SmileScoreCard } from "@/components/SmileScoreCard";
import { useUserProfile } from "@/hooks/useUserProfile";
import { usePushRegistration } from "@/hooks/usePushRegistration";
import { listMyActiveRequests } from "@/lib/services/requests";
import { listMyBookings } from "@/lib/services/bookings";
import { signOut } from "@/lib/services/auth";

type ActiveRequest = { id: string; category: string; status: string; opens_at: string; closes_at: string };
type Booking = { id: string; slot: string; status: string };

export default function WelcomeScreen() {
  const router = useRouter();
  // Dual-role: this screen IS the patient portal. Dentists with a
  // dentist profile have their own /dentist dashboard; this welcome
  // screen never auto-redirects there anymore. The button picked at
  // sign-in time fully decides the destination, and a signed-in user
  // who navigates back here (e.g. tapping the QMS wordmark) sees the
  // patient surface regardless of any dentist profile they may also
  // hold — clean separation, no crossover.
  const { isPatient, isDentist, signedIn, loading, patient } = useUserProfile();
  usePushRegistration();
  const [active, setActive] = useState<ActiveRequest[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  // Inline sign-in form state. The welcome screen now hosts the same
  // PATIENT|DENTIST pill + identifier field + SIGN IN pill UI that
  // /sign-in shows post-tap, so unauthenticated visitors can start
  // the OTP flow from the very first screen. Tapping SIGN IN routes
  // to /sign-in with role + the typed identifier so the OTP screen
  // can send the code immediately.
  const [welcomeRole, setWelcomeRole] = useState<"patient" | "dentist">("patient");
  const [welcomeIdentifier, setWelcomeIdentifier] = useState("");
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
    // No role auto-redirect — the user is on the patient surface
    // because they chose it (via sign-in button or by navigating here).
    // We only load patient-side activity if they actually hold a
    // patient profile; a dentist-only user lands here briefly will see
    // the empty state plus a "Open dentist dashboard" pill below.
    if (!isPatient) {
      setDataLoading(false);
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
  }, [signedIn, isPatient, router]);

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#0A0A0A" }}>
      {/* Full-bleed editorial hero — high-quality smile photo (Pexels
          18392646) fills the entire viewport. Unauthenticated visitors
          land on the brand portrait; signed-in users get the mint
          gradient + portal greeting (handled below).
          The bottom 55% is covered with a layered scrim + frosted glass
          form so the photo reads as the hero while the sign-in UI
          stays legible. Inspired by the Biosora reference: photo top,
          glass form bottom. */}
      {!signedIn ? (
        <>
          <Image
            source={HERO_SMILE}
            resizeMode="cover"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
            }}
          />
          {/* Bottom-anchored dark scrim so glass form pops against
              skin tones without crushing the highlights up top. */}
          <LinearGradient
            colors={[
              "rgba(0,0,0,0.10)",
              "rgba(0,0,0,0.05)",
              "rgba(20,40,38,0.35)",
              "rgba(20,40,38,0.75)",
            ]}
            locations={[0, 0.35, 0.65, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents="none"
          />
        </>
      ) : (
        <>
          {/* Clear-aligner hero photo — signed-in patient surface. The
              cards (PatientPortalGreeting, SmileScoreCard) read as
              frosted glass *over* the photo. */}
          <Image
            source={PATIENT_HOME_BG}
            resizeMode="cover"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              width: "100%",
              height: "100%",
            }}
          />
          {/* Mint-tinted scrim — DARK at top, LIGHT at bottom per user
              direction. Deeper forest mint up top anchors the wordmark
              and "Dentist portal" pill in a moody, premium frame; the
              gradient opens up downward so the clear-aligner photo and
              the activity feed both breathe through. */}
          <LinearGradient
            colors={[
              "rgba(63,122,110,0.72)",
              "rgba(95,168,155,0.48)",
              "rgba(168,220,203,0.28)",
              "rgba(232,242,235,0.18)",
            ]}
            locations={[0, 0.3, 0.65, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
            pointerEvents="none"
          />
        </>
      )}
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <Animated.View style={{ opacity: headerOpacity }}>
          {/* Header — WHITE wordmark centred. The dark top-left lockup
              from the previous welcome layout was replaced (user
              direction: "keep the white logo quote my smile in the
              middle") so the brand reads as a centred banner over the
              mint hero rather than competing with the form below. The
              dentist-portal switcher pills tucks underneath only for
              dual-role signed-in users. */}
          <View className="px-8 pt-6 pb-2 items-center">
            <Wordmark size="md" tone="light" />
            {signedIn && isDentist ? (
              <Pressable
                onPress={() => router.replace("/dentist")}
                className="px-3.5 py-1.5 rounded-full border border-forest mt-3"
                style={{ backgroundColor: "rgba(46,114,104,0.10)" }}
              >
                <Text className="text-[11px] tracking-cap uppercase text-forest font-sans">
                  Dentist portal
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>

        {/* Hero */}
        <Animated.View
          style={{
            opacity: heroOpacity,
            transform: [{ translateY: heroY }],
            flex: 1,
            alignItems: "center",
            paddingHorizontal: 32,
            paddingTop: 40,
            paddingBottom: 48,
          }}
        >
          {/* MARKETING SPLASH — only shown to UNAUTHENTICATED visitors.
              The "Your dream smile, in your hand" lockup is the brand
              hero for the homepage; signed-in patients shouldn't see
              the same marketing pitch every time they open the app. */}
          {!signedIn ? (
            // Photo hero — no tooth icon, no tagline. The Biosora-style
            // frosted glass form below is the entire bottom-half UI.
            // Spacer pushes the form down so the smile photo fills
            // the upper viewport.
            <View style={{ flex: 1, minHeight: 200 }} />
          ) : isPatient ? (
            // Signed-in PATIENT portal greeting — aesthetic card on a
            // soft mint→cream gradient surface, personalised with the
            // patient's first name. No marketing pitch, no CTAs (the
            // bottom tab bar handles navigation: New Quote in the centre,
            // Inbox/Bookings/Sign-out on the sides). Calm/Headspace
            // inspired: soft hierarchy, generous whitespace, one warm
            // accent per element.
            <PatientPortalGreeting name={patient?.full_name ?? null} />
          ) : null}

          {/* Inline sign-in form — frosted-glass surface over the
              smile-photo hero (Biosora reference). BlurView on iOS
              renders a real backdrop blur; web falls back to
              backdrop-filter via the wrapper's style. PATIENT|DENTIST
              pill, single underlined identifier field, white SIGN IN
              pill, Create-account footer link. Tapping SIGN IN routes
              to /sign-in with role + the typed identifier so the OTP
              screen can send the code immediately. */}
          {!signedIn && !loading ? (
            <View
              style={{
                width: "100%",
                maxWidth: 420,
                alignSelf: "center",
                marginTop: 8,
                marginBottom: 24,
                borderRadius: 28,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.22)",
                shadowColor: "#000",
                shadowOpacity: 0.25,
                shadowRadius: 24,
                shadowOffset: { width: 0, height: 12 },
              }}
            >
              <BlurView
                intensity={Platform.OS === "ios" ? 50 : 80}
                tint="dark"
                experimentalBlurMethod="dimezisBlurView"
                style={{
                  padding: 24,
                  gap: 18,
                  // Web fallback — RN-Web's BlurView ignores intensity;
                  // a CSS backdrop-filter + translucent fill gets the
                  // glass effect across browsers.
                  ...(Platform.OS === "web"
                    ? ({
                        backdropFilter: "blur(20px) saturate(140%)",
                        WebkitBackdropFilter: "blur(20px) saturate(140%)",
                        backgroundColor: "rgba(20,40,38,0.45)",
                      } as object)
                    : { backgroundColor: "rgba(20,40,38,0.28)" }),
                }}
              >
              {/* PATIENT | DENTIST pill toggle */}
              <View
                style={{
                  flexDirection: "row",
                  backgroundColor: "rgba(255,255,255,0.22)",
                  borderRadius: 999,
                  padding: 4,
                  alignSelf: "center",
                }}
              >
                {(["patient", "dentist"] as const).map((r) => {
                  const active = welcomeRole === r;
                  return (
                    <View
                      key={r}
                      style={{
                        borderRadius: 999,
                        backgroundColor: active ? "#FFFFFF" : "transparent",
                      }}
                    >
                      <Pressable
                        onPress={() => setWelcomeRole(r)}
                        style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                      >
                        <View
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 22,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter",
                              fontWeight: "600",
                              fontSize: 12,
                              letterSpacing: 2,
                              textTransform: "uppercase",
                              color: active ? "#1F4F47" : "#FFFFFF",
                            }}
                          >
                            {r}
                          </Text>
                        </View>
                      </Pressable>
                    </View>
                  );
                })}
              </View>

              {/* SIGN IN label + identifier field */}
              <View style={{ gap: 8 }}>
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 11,
                    letterSpacing: 3,
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.88)",
                  }}
                >
                  Sign in
                </Text>
                <TextInput
                  value={welcomeIdentifier}
                  onChangeText={setWelcomeIdentifier}
                  placeholder="Mobile or email"
                  placeholderTextColor="rgba(255,255,255,0.65)"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={{
                    fontFamily: "Inter",
                    fontSize: 18,
                    color: "#FFFFFF",
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.55)",
                    paddingVertical: 10,
                  }}
                />
              </View>

              {/* White SIGN IN pill — routes to /sign-in with role +
                  the typed identifier so the OTP send fires straight
                  away on arrival. */}
              <View
                style={{
                  borderRadius: 999,
                  backgroundColor: "rgba(255,255,255,0.92)",
                  overflow: "hidden",
                }}
              >
                <Pressable
                  onPress={() => {
                    Keyboard.dismiss();
                    router.push({
                      pathname: "/sign-in",
                      params: {
                        role: welcomeRole,
                        mode: "signin",
                        identifier: welcomeIdentifier.trim(),
                      },
                    });
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
                >
                  <View
                    style={{
                      paddingVertical: 16,
                      alignItems: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontWeight: "600",
                        fontSize: 13,
                        letterSpacing: 3,
                        textTransform: "uppercase",
                        color: "#1F4F47",
                      }}
                    >
                      Sign in
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* New to QMS? Create account — routes to the sign-up
                  flow with the role already chosen. */}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/sign-in",
                    params: { role: welcomeRole, mode: "signup" },
                  })
                }
                hitSlop={10}
              >
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 13,
                    color: "rgba(255,255,255,0.92)",
                    textAlign: "center",
                  }}
                >
                  New to QuoteMySmile?{" "}
                  <Text style={{ textDecorationLine: "underline", fontWeight: "600" }}>
                    Create account
                  </Text>
                </Text>
              </Pressable>
              </BlurView>
            </View>
          ) : null}

          {/* Signed-in CTAs.
              Patients NO LONGER see Get a quote / My inbox / Sign out
              here — those three actions live in PatientTabBar at the
              bottom of the screen, so duplicating them above was just
              visual noise (user feedback: "remove this as it's already
              in navigation bar"). The dentist-only branch is kept
              because dentists don't get the patient tab bar and still
              need a one-tap route into their dashboard + a sign-out
              affordance. */}
          {signedIn && !isPatient ? (
            <View className="mb-12 w-full max-w-md" style={{ gap: 12 }}>
              {isDentist ? (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  onPress={() => router.replace("/dentist")}
                >
                  Open dentist dashboard
                </Button>
              ) : null}
              <Button
                variant="tonal"
                size="md"
                fullWidth
                onPress={async () => {
                  await signOut();
                  router.replace("/");
                }}
              >
                Sign out
              </Button>
            </View>
          ) : null}

          {/* Active state for signed-in.
              Hero status card surfaces the MOST RECENT open request at
              full-card prominence (Quip rescue pattern), while the rest
              of Activity stays a thin secondary list. */}
          {/* Smile Score — Toothpic-style engagement hook. Shows the quiz
              CTA for new users and the score + band for returning users.
              Tapping retakes the 30s quiz. Patient-only. */}
          {signedIn && isPatient ? (
            <View className="w-full max-w-md mb-10">
              <SmileScoreCard />
            </View>
          ) : null}

          {signedIn ? (
            <View className="w-full max-w-md mb-16 border-t border-linen pt-12">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Activity
              </Text>
              {dataLoading ? (
                <View className="gap-4">
                  <Skeleton height={120} />
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
                  {/* Most recent open request → big hero card */}
                  {active[0] ? (
                    <View style={{ marginBottom: active.length > 1 || bookings.length > 0 ? 18 : 0 }}>
                      <HeroStatusCard
                        request={active[0]}
                        onPress={() =>
                          router.push({ pathname: "/live", params: { request: active[0].id } })
                        }
                      />
                    </View>
                  ) : null}
                  {/* Any additional active requests stay as compact rows below */}
                  {active.slice(1).map((r) => (
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

      </ScrollView>
      {signedIn ? <PatientTabBar /> : null}
      {/* Wordmark + Settings/Terms/Privacy footer — relocated BELOW
          the tab bar (user request: "put this below navigational
          bar"). Previously this lived at the bottom of the ScrollView
          where it appeared ABOVE the floating tab bar; users had to
          scroll to reach it and it competed with the navbar visually.
          Sitting below the tab bar makes it a true page-foot row.
          Wrapped in horizontally-scrolling ScrollView so the pills
          can wrap gracefully on narrow phones without clipping. */}
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 4,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <Wordmark size="sm" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, alignItems: "center" }}
        >
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
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/**
 * Signed-in patient portal greeting — soft mint→cream card, personalised
 * with the patient's first name. No marketing pitch, no CTAs (tab bar
 * handles nav). Placeholder until the wider portal redesign lands.
 */
function PatientPortalGreeting({ name }: { name: string | null }) {
  const first = (name ?? "").trim().split(/\s+/)[0] || "there";
  const hour = new Date().getHours();
  const tod =
    hour < 5 ? "Good evening" : hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return (
    <View
      style={{
        width: "100%",
        maxWidth: 420,
        borderRadius: 28,
        // Layered shadow for that floating "liquid glass" feel — a tight
        // dark ambient + a wide diffuse mint glow. iOS handles both via
        // shadow*; Android elevation handles the rest.
        shadowColor: "#1F4F47",
        shadowOpacity: 0.22,
        shadowRadius: 32,
        shadowOffset: { width: 0, height: 18 },
        elevation: 12,
      }}
    >
      <View
        style={{
          borderRadius: 28,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: "rgba(255,255,255,0.45)",
          padding: 28,
          alignItems: "center",
          // Almost clear fallback — the photo behind should dominate.
          backgroundColor: "rgba(255,255,255,0.05)",
        }}
      >
        {/* Frosted glass — barely-there backdrop blur. The aligner photo
            reads through almost untouched; only the rim/gleam sells the
            "glass" reading. */}
        <BlurView
          tint="light"
          intensity={Platform.OS === "android" ? 18 : 10}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Trace mint tint — just a whisper of brand hue. */}
        <LinearGradient
          colors={[
            "rgba(125,202,184,0.05)",
            "rgba(168,220,203,0.03)",
            "rgba(255,255,255,0.01)",
          ]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        {/* Specular highlight — top-left "wet" gleam (kept) so the edge
            still catches light like real glass. */}
        <LinearGradient
          colors={["rgba(255,255,255,0.40)", "rgba(255,255,255,0)"]}
          locations={[0, 0.6]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 0.6 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
        {/* Bottom-edge faint dark reflection — grounding line. */}
        <LinearGradient
          colors={["rgba(31,79,71,0)", "rgba(31,79,71,0.06)"]}
          locations={[0.7, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
          pointerEvents="none"
        />
        {/* Mint orbs — ghost-faint so they don't muddy the see-through glass. */}
        <View
          style={{
            position: "absolute",
            top: -36,
            left: -36,
            width: 140,
            height: 140,
            borderRadius: 70,
            backgroundColor: "rgba(46,114,104,0.06)",
          }}
        />
        <View
          style={{
            position: "absolute",
            bottom: -32,
            right: -32,
            width: 120,
            height: 120,
            borderRadius: 60,
            backgroundColor: "rgba(168,220,203,0.08)",
          }}
        />
        {/* Inner highlight ring — a hairline 1px white inset using a top
            gradient strip. Sells the bevelled-glass edge. */}
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: "rgba(255,255,255,0.85)",
          }}
        />
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 10,
          letterSpacing: 1.8,
          textTransform: "uppercase",
          color: "#8A7E70",
          marginBottom: 6,
          fontWeight: "500",
        }}
      >
        {tod}
      </Text>
      <Text
        style={{
          fontFamily: "Italiana",
          fontSize: 32,
          lineHeight: 36,
          color: "#2A2520",
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        Hi, {first}
      </Text>
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 13,
          lineHeight: 19,
          color: "#6E6457",
          textAlign: "center",
          maxWidth: 280,
        }}
      >
        Here's your smile snapshot — tap the camera below for a new quote.
      </Text>
      </View>
    </View>
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
  glyph: SketchIconName;
  label: string;
  blurb: string;
  onPress: () => void;
}) {
  // Pressable function-style with layout props (padding/alignItems/flex)
  // is unsafe — iOS drops them intermittently. Card visuals + flex sit
  // on a stable wrapper View; Pressable holds only the press handler +
  // opacity feedback on a stable inner View for the row layout.
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 20,
        shadowColor: "#2E7268",
        shadowOpacity: 0.18,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
        borderWidth: 1,
        borderColor: "rgba(31,79,71,0.06)",
        overflow: "hidden",
      }}
    >
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
    >
      <View
        style={{
          paddingVertical: 22,
          paddingHorizontal: 18,
          alignItems: "center",
        }}
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
        <SketchIcon name={glyph} size={30} color="#2E7268" strokeWidth={1.5} />
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
      </View>
    </Pressable>
    </View>
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
  icon: SketchIconName;
  onPress: () => void;
}) {
  // Tend Dental tactile card: cream surface, warm hairline border, mint
  // accent for patient / deep-teal for dentist. Centered icon-over-serif
  // label reads like a healthcare brand tile, not a marketing pill.
  // Background sits on a wrapping View — Pressable function-style was
  // intermittently dropping backgroundColor on iOS.
  const isDentist = role === "dentist";
  const accent = isDentist ? "#2E7268" : "#5FA89B";
  const accentSoft = isDentist ? "rgba(31,79,71,0.10)" : "rgba(95,168,155,0.14)";

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#FFFFFF",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(31,79,71,0.10)",
        shadowColor: "#2E7268",
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
        style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
      >
        <View
          style={{
            paddingVertical: 14,
            paddingHorizontal: 10,
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 19,
              backgroundColor: accentSoft,
              borderWidth: 1,
              borderColor: isDentist ? "rgba(31,79,71,0.18)" : "rgba(95,168,155,0.30)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <SketchIcon name={icon} size={22} color={accent} strokeWidth={1.5} />
          </View>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.8}
            style={{
              fontFamily: "Inter",
              fontWeight: "600",
              fontSize: 13,
              lineHeight: 17,
              color: "#2A2520",
              letterSpacing: 0.1,
              textAlign: "center",
              includeFontPadding: false,
            }}
          >
            {title}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
