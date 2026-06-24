import { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, Pressable, Animated, Easing, Image, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/Wordmark";
import { LiveBadge } from "@/components/LiveBadge";
import { Button } from "@/components/Button";
import { SketchIcon, type SketchIconName } from "@/components/SketchIcon";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

// Dentist dashboard hero photo — close-up of an artificial-teeth dental
// cast on a soft cream surface (Pexels 4687416, 3840x2560). Speaks
// directly to the dentist's craft and gives the glassy cards a real
// photo to refract through, matching the patient home's clear-aligner bg.
const DENTIST_BG = require("@/assets/images/dentist-bg.jpg");
import {
  listLiveNearbyRequests,
  subscribeNearbyRequests,
  getVerificationStatus,
  verifyCredentials,
  getMyAccruedFees,
  getMyClinic,
  getMyEarnings,
} from "@/lib/services/dentist";
import { signOut } from "@/lib/services/auth";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  VerificationBanner,
  type AhpraStatus,
  type AbnStatus,
} from "@/components/VerificationBanner";

type DbRequest = {
  id: string;
  category: string;
  status: string;
  closes_at: string;
  opens_at: string;
  photo_quality_score: number | null;
  symptom_json: Record<string, unknown> | null;
};

// Sample cards shown ONLY in dev builds when the live nearby query
// returns zero rows — keeps the dashboard demoable while we have no
// real patient traffic. In production the empty state shows instead so
// new dentists don't see fake cards they can't act on.
const FALLBACK: DbRequest[] = __DEV__
  ? [
      {
        id: "req-1",
        category: "Filling + clean",
        status: "open",
        opens_at: new Date(Date.now() - 5 * 60_000).toISOString(),
        closes_at: new Date(Date.now() + 28 * 60_000).toISOString(),
        photo_quality_score: 0.82,
        symptom_json: null,
      },
      {
        id: "req-2",
        category: "Crown consult",
        status: "open",
        opens_at: new Date(Date.now() - 12 * 60_000).toISOString(),
        closes_at: new Date(Date.now() + 72 * 60_000).toISOString(),
        photo_quality_score: 0.65,
        symptom_json: null,
      },
    ]
  : [];

export default function DentistDashboard() {
  const router = useRouter();
  const { dentist } = useUserProfile();
  const [requests, setRequests] = useState<DbRequest[]>([]);
  const [verif, setVerif] = useState<{
    ahpra: AhpraStatus;
    abn: AbnStatus;
    ahpraRegType?: string | null;
  }>({ ahpra: "unknown", abn: "unknown" });
  const [rechecking, setRechecking] = useState(false);
  const [fees, setFees] = useState<{ cents: number; bookings: number } | null>(
    null,
  );
  const [clinicName, setClinicName] = useState<string | null>(null);
  const [earnings, setEarnings] = useState<{
    totalCents: number;
    monthCents: number;
    bookings: number;
    bookingsThisMonth: number;
    avgTicketCents: number;
  } | null>(null);

  const loadVerification = async () => {
    const v = await getVerificationStatus();
    if (!v) return;
    const ahpraStatus = (v.ahpra?.ahpra_status ?? "unknown") as AhpraStatus;
    const abnStatus: AbnStatus = v.clinic?.abn_verified_at
      ? "verified"
      : v.clinic?.abn
        ? "pending"
        : "unknown";
    setVerif({
      ahpra: ahpraStatus,
      abn: abnStatus,
      ahpraRegType: v.ahpra?.ahpra_reg_type ?? null,
    });
  };

  useEffect(() => {
    listLiveNearbyRequests()
      .then((d) => setRequests(d as DbRequest[]))
      .catch(() => {
        // Not signed in or no clinic — show fallback
      });
    loadVerification().catch(() => {});
    getMyAccruedFees()
      .then((f) => setFees({ cents: f.cents, bookings: f.bookings }))
      .catch(() => {});
    getMyClinic()
      .then((c) => setClinicName((c as { name?: string } | null)?.name ?? null))
      .catch(() => {});
    getMyEarnings()
      .then(setEarnings)
      .catch(() => {});
    const ch = subscribeNearbyRequests((payload: any) => {
      if (payload.eventType === "INSERT") {
        setRequests((r) => [payload.new as DbRequest, ...r]);
      }
    });
    return () => {
      (ch as any)?.unsubscribe?.();
    };
  }, []);

  const recheck = async () => {
    if (!dentist?.ahpra_no) return;
    setRechecking(true);
    try {
      const v = await getVerificationStatus();
      await verifyCredentials({
        ahpraNo: dentist.ahpra_no,
        expectedName: dentist.full_name ?? "",
        abn: v?.clinic?.abn ?? undefined,
        clinicId: v?.clinic?.id ?? undefined,
      });
      await loadVerification();
    } finally {
      setRechecking(false);
    }
  };

  const list = requests.length > 0 ? requests : FALLBACK;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F5F1E8" }}>
      {/* Full-bleed dental-cast hero photo — gives the glassy cards a
          real photo surface to refract through, matching the patient
          home's clear-aligner backdrop. */}
      <Image
        source={DENTIST_BG}
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
      {/* Mint scrim — DARK at top to anchor the wordmark, OPENING up
          toward the bottom so the cast and bone surface read through.
          Matches the patient home gradient direction. */}
      <LinearGradient
        colors={[
          "rgba(63,122,110,0.62)",
          "rgba(95,168,155,0.40)",
          "rgba(168,220,203,0.24)",
          "rgba(245,241,232,0.30)",
        ]}
        locations={[0, 0.3, 0.65, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      />
      <ScrollView>
        {/* Top */}
        <View className="px-8 py-6 border-b border-linen flex-row items-center justify-between">
          <Wordmark size="sm" />
          <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">
            Dentist portal
          </Text>
        </View>

        {/* Verification banner */}
        <View className="px-8 pt-6">
          <VerificationBanner
            ahpra={verif.ahpra}
            abn={verif.abn}
            ahpraRegType={verif.ahpraRegType}
            onRecheck={recheck}
            rechecking={rechecking}
          />
        </View>

        {/* Earnings hero — the page-defining moment. A dentist landing
            here should *feel* their pipeline first, before they see
            anything else. Big serif number, mint gradient backdrop,
            month + average inset rows. Platform fees are demoted to
            a quiet single-line footer underneath. */}
        <EarningsHero
          totalCents={earnings?.totalCents ?? 0}
          monthCents={earnings?.monthCents ?? 0}
          bookingsThisMonth={earnings?.bookingsThisMonth ?? 0}
          avgTicketCents={earnings?.avgTicketCents ?? 0}
          feesCents={fees?.cents ?? 0}
          feesBookings={fees?.bookings ?? 0}
        />

        {/* Clinic identity strip — compact wordmark + accepting pill.
            Used to be a full 200pt hero; downsized so the earnings
            number above stays the page's protagonist. */}
        <View className="px-8 pt-10 pb-10 items-center">
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-3">
            ·  Your practice  ·
          </Text>
          <Text
            style={{
              fontFamily: "CormorantGaramond_700Bold",
              fontSize: 30,
              lineHeight: 34,
              color: "#2A2520",
              letterSpacing: -0.6,
              fontWeight: "700",
              textAlign: "center",
              marginBottom: 4,
            }}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {clinicName ?? dentist?.full_name ?? "Your clinic"}
          </Text>
          <Text
            style={{
              fontFamily: "Allura",
              fontSize: 22,
              color: "#5FA89B",
              marginBottom: 16,
            }}
          >
            est. on QuoteMySmile
          </Text>

          <AcceptingBadge />
        </View>

        {/* Live requests — redesigned as rich opportunity cards.
            Previous treatment read as a flat list; new cards have a
            coloured urgency stripe, category glyph, photo-quality grade
            badge, symptom hint and a full-width Quote CTA so each row
            feels like a real opportunity, not a line item. */}
        <View className="px-8 pb-12">
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 18,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <PulseDot />
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 11,
                  letterSpacing: 2.4,
                  textTransform: "uppercase",
                  color: "#2E7268",
                  fontWeight: "700",
                }}
              >
                Live nearby
              </Text>
            </View>
            <View
              style={{
                backgroundColor: "#2E7268",
                paddingHorizontal: 12,
                paddingVertical: 5,
                borderRadius: 999,
                minWidth: 36,
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 12,
                  color: "#FFFFFF",
                  fontWeight: "700",
                }}
              >
                {list.length}
              </Text>
            </View>
          </View>

          {list.length === 0 ? (
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 20,
                borderWidth: 1,
                borderColor: "rgba(31,79,71,0.10)",
                paddingHorizontal: 24,
                paddingVertical: 32,
                alignItems: "center",
                shadowColor: "#2E7268",
                shadowOpacity: 0.06,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: "CormorantGaramond_500Medium",
                  fontSize: 22,
                  lineHeight: 26,
                  color: "#2A2520",
                  textAlign: "center",
                  marginBottom: 8,
                  letterSpacing: -0.2,
                }}
              >
                No live requests right now.
              </Text>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 13,
                  lineHeight: 20,
                  color: "#6E6457",
                  textAlign: "center",
                  maxWidth: 280,
                }}
              >
                You're set to accept — new patient quotes within your service
                area will pop in here automatically.
              </Text>
            </View>
          ) : null}

          {list.map((r) => {
            const minutesLeft = Math.max(
              0,
              Math.round((new Date(r.closes_at).getTime() - Date.now()) / 60_000),
            );
            const urgent = minutesLeft <= 30;
            const veryUrgent = minutesLeft <= 10;
            const accent = veryUrgent ? "#9E5E47" : urgent ? "#C8A75A" : "#2E7268";
            const glyph = categoryGlyph(r.category);
            const grade =
              r.photo_quality_score == null
                ? null
                : r.photo_quality_score >= 0.8
                  ? "A"
                  : r.photo_quality_score >= 0.6
                    ? "B"
                    : "C";
            const symptomHint = pickSymptomHint(r.symptom_json);
            return (
              <View key={r.id} style={{ marginBottom: 16 }}>
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/dentist/request/[id]",
                    params: { id: r.id },
                  })
                }
                style={({ pressed }) => ({
                  // Layout (marginBottom) lifted to the wrapping View
                  // above so iOS can't drop it from this function-style.
                  opacity: pressed ? 0.92 : 1,
                  backgroundColor: pressed ? "#FAF6EC" : "#FFFFFF",
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: urgent
                    ? "rgba(158,94,71,0.30)"
                    : "rgba(31,79,71,0.10)",
                  overflow: "hidden",
                  shadowColor: "#2E7268",
                  shadowOpacity: urgent ? 0.14 : 0.08,
                  shadowRadius: urgent ? 18 : 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: urgent ? 5 : 3,
                })}
              >
                {/* Coloured urgency stripe on the left edge. */}
                <View
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: 4,
                    backgroundColor: accent,
                  }}
                />

                <View style={{ paddingHorizontal: 20, paddingVertical: 18 }}>
                  {/* Top row — countdown chip + photo grade + open badge. */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 14,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 5,
                        borderRadius: 999,
                        backgroundColor: `${accent}1A`,
                      }}
                    >
                      <SketchIcon
                        name="clock"
                        size={12}
                        color={accent}
                        noGhost
                        strokeWidth={1.8}
                      />
                      <Text
                        style={{
                          fontFamily: "Inter",
                          fontSize: 11,
                          letterSpacing: 1.2,
                          textTransform: "uppercase",
                          color: accent,
                          fontWeight: "700",
                        }}
                      >
                        {minutesLeft} min
                      </Text>
                    </View>
                    <View
                      style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                    >
                      {grade ? (
                        <View
                          style={{
                            paddingHorizontal: 8,
                            paddingVertical: 4,
                            borderRadius: 6,
                            backgroundColor: "rgba(31,79,71,0.08)",
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: "Inter",
                              fontSize: 10,
                              letterSpacing: 0.8,
                              color: "#2E7268",
                              fontWeight: "700",
                            }}
                          >
                            Photo · {grade}
                          </Text>
                        </View>
                      ) : null}
                      <LiveBadge label="Open" />
                    </View>
                  </View>

                  {/* Body — category glyph + name + symptom hint. */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 14,
                      marginBottom: 16,
                    }}
                  >
                    <View
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: "rgba(95,168,155,0.14)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <SketchIcon
                        name={glyph}
                        size={28}
                        color="#2E7268"
                        noGhost
                        strokeWidth={1.6}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontFamily: "CormorantGaramond_700Bold",
                          fontSize: 24,
                          color: "#2E7268",
                          letterSpacing: -0.3,
                          fontWeight: "700",
                        }}
                        numberOfLines={1}
                      >
                        {r.category}
                      </Text>
                      {symptomHint ? (
                        <Text
                          style={{
                            fontFamily: "Inter",
                            fontSize: 12,
                            color: "#6E6457",
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {symptomHint}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {/* Full-width CTA — feels like a real button, not a tag. */}
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      backgroundColor: "#2E7268",
                      borderRadius: 14,
                      paddingVertical: 14,
                      minHeight: 48,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 14,
                        color: "#FFFFFF",
                        fontWeight: "700",
                        letterSpacing: 0.4,
                      }}
                    >
                      Quote now
                    </Text>
                    <SketchIcon
                      name="arrow-right"
                      size={16}
                      color="#FFFFFF"
                      noGhost
                      strokeWidth={1.8}
                    />
                  </View>
                </View>
              </Pressable>
              </View>
            );
          })}
        </View>

        {/* Manage section — icon tile grid. Earlier full-width stacked
            buttons all read at the same visual weight and crowded the
            page; converting to a 2-up tile grid lets the eye scan five
            destinations in one glance, gives each label a sketch glyph,
            and reads as a real "menu" rather than a column of CTAs. */}
        <View className="px-8 pb-10 border-t border-linen pt-10">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6 text-center">
            Manage
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <ManageTile
              icon="calendar"
              label="Bookings"
              onPress={() => router.push("/dentist/bookings")}
              primary
            />
            <ManageTile
              icon="magnify"
              label="Stats"
              onPress={() => router.push("/dentist/stats")}
            />
            <ManageTile
              icon="shield"
              label="Settings"
              onPress={() => router.push("/dentist/settings")}
            />
            <ManageTile
              icon="info"
              label="Guide"
              onPress={() => router.push("/dentist/guide")}
            />
          </View>
          {/* Sample-won lives as a quiet text link beneath the grid —
              it's a preview/demo affordance, not a primary action. */}
          <View style={{ alignSelf: "center", marginTop: 18 }}>
            <Pressable
              onPress={() => router.push("/dentist/won")}
              hitSlop={10}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
            >
              <View style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
                <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">
                  Preview · won notification
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        {/* Sign-out — visible on the home screen so dentists never have to
            dig into Settings to switch accounts. Tonal mint so it reads as
            an action, not destructive. */}
        <View className="px-8 pb-24 pt-2">
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
      </ScrollView>
    </SafeAreaView>
  );
}

/**
 * EarningsHero — the dopamine-first hero card on the dentist dashboard.
 *
 * Renders a full-bleed mint-gradient panel with the dentist's running
 * total in 64pt Cormorant serif, then this-month + average-ticket inset
 * rows in a tight grid. A faint cream price tag silhouette sits at top
 * right as a brand mark. Platform fees collapse to a single quiet line
 * at the foot so they don't compete for attention — the dentist's
 * revenue should be the headline, not what they owe us.
 *
 * Empty state ($0) shows an aspirational "earnings start here" line
 * instead of a sad-looking zero, so brand-new dentists don't open the
 * app to disappointment on day zero.
 */
function EarningsHero({
  totalCents,
  monthCents,
  bookingsThisMonth,
  avgTicketCents,
  feesCents,
  feesBookings,
}: {
  totalCents: number;
  monthCents: number;
  bookingsThisMonth: number;
  avgTicketCents: number;
  feesCents: number;
  feesBookings: number;
}) {
  const totalAud = totalCents / 100;
  const monthAud = monthCents / 100;
  const avgAud = avgTicketCents / 100;
  const isEmpty = totalCents === 0;

  return (
    <View style={{ paddingHorizontal: 18, paddingTop: 20 }}>
      <View
        style={{
          borderRadius: 28,
          overflow: "hidden",
          shadowColor: "#2E7268",
          shadowOpacity: 0.22,
          shadowRadius: 22,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        }}
      >
        <LinearGradient
          colors={["#7BC5B5", "#4F9D8E", "#2E7268"]}
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ paddingHorizontal: 26, paddingTop: 26, paddingBottom: 22 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 11,
                letterSpacing: 2.4,
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.85)",
                fontWeight: "700",
              }}
            >
              You've earned
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.16)",
              }}
            >
              <SketchIcon
                name="sparkle"
                size={11}
                color="#FFFFFF"
                noGhost
                strokeWidth={1.8}
              />
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 10,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  color: "#FFFFFF",
                  fontWeight: "700",
                }}
              >
                via QMS
              </Text>
            </View>
          </View>

          {isEmpty ? (
            <View style={{ paddingVertical: 12 }}>
              <Text
                style={{
                  fontFamily: "CormorantGaramond_700Bold",
                  fontSize: 38,
                  lineHeight: 44,
                  color: "#FFFFFF",
                  letterSpacing: -0.8,
                  fontWeight: "700",
                  marginBottom: 4,
                }}
              >
                Your first booking
              </Text>
              <Text
                style={{
                  fontFamily: "Allura",
                  fontSize: 32,
                  color: "rgba(255,255,255,0.92)",
                  marginBottom: 8,
                }}
              >
                starts the running total.
              </Text>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 12,
                  lineHeight: 18,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                Quote nearby requests below — every booking won lands on
                this card.
              </Text>
            </View>
          ) : (
            <>
              <Text
                style={{
                  fontFamily: "CormorantGaramond_700Bold",
                  fontSize: 72,
                  lineHeight: 78,
                  color: "#FFFFFF",
                  letterSpacing: -2.2,
                  fontWeight: "700",
                }}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.55}
              >
                {formatAud(totalAud)}
              </Text>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 11,
                  letterSpacing: 1.4,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.85)",
                  fontWeight: "600",
                  marginTop: 2,
                }}
              >
                total quote value · all-time
              </Text>
            </>
          )}

          {/* Inset month + avg row — only meaningful once there's data. */}
          {!isEmpty ? (
            <View
              style={{
                marginTop: 22,
                paddingTop: 18,
                borderTopWidth: 1,
                borderTopColor: "rgba(255,255,255,0.22)",
                flexDirection: "row",
                gap: 12,
              }}
            >
              <HeroStat
                label="This month"
                value={formatAud(monthAud)}
                sub={`${bookingsThisMonth} booking${bookingsThisMonth === 1 ? "" : "s"}`}
              />
              <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.22)" }} />
              <HeroStat
                label="Avg ticket"
                value={formatAud(avgAud)}
                sub="per booking"
              />
            </View>
          ) : null}
        </LinearGradient>
      </View>

      {/* Quiet platform-fee footer — no card, just a soft mint line so
          the dentist sees what they'll be invoiced without it competing
          with the earnings number above. */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginTop: 12,
          paddingHorizontal: 14,
        }}
      >
        <View
          style={{
            width: 4,
            height: 4,
            borderRadius: 2,
            backgroundColor: "rgba(31,79,71,0.35)",
          }}
        />
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 11,
            color: "#6E6457",
            letterSpacing: 0.2,
            textAlign: "center",
          }}
        >
          A${(feesCents / 100).toFixed(2)} platform fee this month · {feesBookings}{" "}
          attended · A$5 each
        </Text>
      </View>
    </View>
  );
}

function HeroStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 9,
          letterSpacing: 1.6,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.78)",
          fontWeight: "700",
          marginBottom: 4,
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontFamily: "CormorantGaramond_700Bold",
          fontSize: 26,
          color: "#FFFFFF",
          letterSpacing: -0.4,
          fontWeight: "700",
          marginBottom: 2,
        }}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      <Text
        style={{
          fontFamily: "Inter",
          fontSize: 10,
          letterSpacing: 0.6,
          color: "rgba(255,255,255,0.75)",
        }}
      >
        {sub}
      </Text>
    </View>
  );
}

function formatAud(aud: number): string {
  // Drop trailing .00 for whole-dollar amounts — feels less accounting,
  // more brand. Always two decimals on partial dollars so the figure
  // still reads as currency, not a count.
  if (!Number.isFinite(aud)) return "$0";
  const rounded = Math.round(aud * 100) / 100;
  const whole = Math.floor(rounded);
  const cents = Math.round((rounded - whole) * 100);
  const wholeStr = whole.toLocaleString("en-AU");
  return cents === 0 ? `$${wholeStr}` : `$${wholeStr}.${String(cents).padStart(2, "0")}`;
}

/** "Accepting requests" status indicator — flat, non-interactive.
 *  Earlier revisions used a mint-gradient pill with a drop shadow and
 *  large hit-target padding, which made it read as a tappable CTA even
 *  though tapping it does nothing. Flattened to a quiet inline label
 *  with a pulsing mint dot — clearly status, not a button. */
function AcceptingBadge() {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 2.2,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 1400,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, { toValue: 0.6, duration: 0, useNativeDriver: true }),
        ]),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale, opacity]);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
      }}
    >
      {/* Pulsing mint dot — same convention as the LiveBadge elsewhere. */}
      <View style={{ width: 10, height: 10, alignItems: "center", justifyContent: "center" }}>
        <Animated.View
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: 5,
            backgroundColor: "#2E7268",
            opacity,
            transform: [{ scale }],
          }}
        />
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: "#2E7268",
          }}
        />
      </View>
      <Text
        style={{
          fontFamily: "Inter-Medium",
          fontSize: 11,
          letterSpacing: 1.8,
          textTransform: "uppercase",
          color: "#2E7268",
          fontWeight: "600",
        }}
      >
        Accepting requests
      </Text>
    </View>
  );
}

/** Animated red/teal pulse next to the "Live nearby" header — makes
 *  the section feel alive instead of static. */
function PulseDot() {
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.8,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 0,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);
  return (
    <View style={{ width: 12, height: 12, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={{
          position: "absolute",
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: "#2E7268",
          opacity: scale.interpolate({ inputRange: [1, 1.8], outputRange: [0.5, 0] }),
          transform: [{ scale }],
        }}
      />
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: "#2E7268",
        }}
      />
    </View>
  );
}

/** Map a category string to a sketch glyph. Loose substring match so
 *  free-form labels like "Filling + clean" still pick the right icon. */
function categoryGlyph(category: string): SketchIconName {
  const c = category.toLowerCase();
  if (/emerg|pain|broken|abscess/.test(c)) return "emergency";
  if (/whit|bleach/.test(c)) return "whiten";
  if (/clean|hyg/.test(c)) return "tooth-clean";
  if (/crown|cap/.test(c)) return "crown";
  if (/implant/.test(c)) return "implant";
  if (/wisdom|extract/.test(c)) return "wisdom";
  if (/ortho|brace|invis|align/.test(c)) return "ortho";
  if (/check|consult/.test(c)) return "tooth";
  return "tooth";
}

/** Pull one short hint line out of the symptom_json blob. Designed to
 *  fail gracefully — keys are loose because the schema is still
 *  evolving and dentists shouldn't see "undefined". */
function pickSymptomHint(s: Record<string, unknown> | null | undefined): string | null {
  if (!s || typeof s !== "object") return null;
  const pain = (s as Record<string, unknown>).pain_level;
  const since = (s as Record<string, unknown>).pain_since;
  const note = (s as Record<string, unknown>).note;
  if (typeof note === "string" && note.trim().length > 0) {
    return note.length > 60 ? note.slice(0, 57) + "…" : note;
  }
  if (typeof pain === "number") {
    return `Pain ${pain}/10${typeof since === "string" ? ` · ${since}` : ""}`;
  }
  return null;
}

function ManageTile({
  icon,
  label,
  onPress,
  primary,
}: {
  icon: SketchIconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  // Wrapper View carries flex sizing + visual surface; Pressable owns
  // only opacity feedback; inner View owns padding/alignItems/gap so
  // iOS can never drop them from a function-style.
  return (
    <View
      style={{
        flexBasis: "47%",
        flexGrow: 1,
        backgroundColor: primary ? "#2E7268" : "#FFFFFF",
        borderRadius: 18,
        borderWidth: primary ? 0 : 1,
        borderColor: "rgba(31,79,71,0.10)",
        shadowColor: "#2E7268",
        shadowOpacity: primary ? 0.18 : 0.06,
        shadowRadius: primary ? 14 : 10,
        shadowOffset: { width: 0, height: primary ? 6 : 3 },
        elevation: primary ? 4 : 2,
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
            paddingHorizontal: 14,
            alignItems: "center",
            gap: 10,
          }}
        >
          <SketchIcon
            name={icon}
            size={26}
            color={primary ? "#FFFFFF" : "#2E7268"}
            strokeWidth={1.6}
            noGhost
          />
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 12,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              color: primary ? "#FFFFFF" : "#2A2520",
              fontWeight: "700",
            }}
          >
            {label}
          </Text>
        </View>
      </Pressable>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text
        style={{
          fontFamily: "CormorantGaramond_700Bold",
          fontSize: 30,
          color: "#2E7268",
          letterSpacing: -0.5,
          fontWeight: "700",
        }}
      >
        {value}
      </Text>
      <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-1">
        {label}
      </Text>
    </View>
  );
}
