import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { SmileScoreGauge } from "@/components/SmileScoreGauge";
import { MouthArchDiagram, type CaptureRegionState } from "@/components/MouthArchDiagram";
import { useUserProfile } from "@/hooks/useUserProfile";
import { getMySmileScore, smileScoreBand } from "@/lib/services/smileScore";

/**
 * Smile Map — patient-facing capture guide modelled on the "Treatment
 * Plan" screen pattern from modern dental UI references, repurposed for
 * QMS scope.
 *
 * We don't do clinical detection or treatment recommendations (AHPRA
 * scope). Instead this screen tells the patient WHICH PHOTOS to take so
 * a dentist can quote accurately — that's the QMS marketplace job to be
 * done.
 *
 * Layout:
 *   • Greeting "Hi, {first name}" + subtitle
 *   • Segmented "Overview / Photo guide" tabs
 *   • Smile Score gauge (overview) or arch diagram (photo guide)
 *   • Capture-region chips with state
 *   • "Start a quote" CTA → /categories
 */

type Tab = "overview" | "guide";

export default function SmileMapScreen() {
  const router = useRouter();
  const { patient } = useUserProfile();
  const [tab, setTab] = useState<Tab>("overview");
  const [scoreState, setScoreState] = useState<{ score: number | null; loading: boolean }>({
    score: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    getMySmileScore()
      .then((r) => mounted && setScoreState({ score: r.score, loading: false }))
      .catch(() => mounted && setScoreState({ score: null, loading: false }));
    return () => {
      mounted = false;
    };
  }, []);

  const first = (patient?.full_name ?? "").trim().split(/\s+/)[0] || "there";
  const band = scoreState.score != null ? smileScoreBand(scoreState.score) : null;

  // No persistent capture state outside the active quote flow yet —
  // every region starts pending. Once the patient is mid-quote, we
  // could read from the capture hook, but for this overview screen the
  // 4 regions are a guide, not a status.
  const regions: CaptureRegionState[] = [
    { key: "front-smile", captured: false },
    { key: "upper-arch", captured: false },
    { key: "lower-arch", captured: false },
    { key: "problem-area", captured: false, active: true },
  ];

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: "#F5F1E8" }}>
      <LinearGradient
        colors={["#C8E8DC", "#E8F2EB", "#F5F1E8", "#F5F1E8"]}
        locations={[0, 0.25, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <BackBar title="Smile Map" />
      <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Greeting */}
        <View style={{ paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16 }}>
          <Text
            style={{
              fontFamily: "Italiana",
              fontSize: 30,
              lineHeight: 34,
              color: "#2A2520",
            }}
          >
            Hi, {first}
          </Text>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 13,
              color: "#6E6457",
              marginTop: 4,
            }}
          >
            Here's your smile snapshot.
          </Text>
        </View>

        {/* Segmented tabs */}
        <View
          style={{
            marginHorizontal: 24,
            backgroundColor: "rgba(255,255,255,0.7)",
            borderRadius: 999,
            padding: 4,
            flexDirection: "row",
            borderWidth: 1,
            borderColor: "rgba(31,79,71,0.10)",
          }}
        >
          {[
            { id: "overview" as const, label: "Overview" },
            { id: "guide" as const, label: "Photo guide" },
          ].map((t) => {
            const selected = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 999,
                  backgroundColor: selected ? "#2A2520" : "transparent",
                  alignItems: "center",
                }}
              >
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 12,
                    fontWeight: "600",
                    letterSpacing: 0.4,
                    color: selected ? "#FFFFFF" : "#6E6457",
                  }}
                >
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {tab === "overview" ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 28, alignItems: "center" }}>
            {scoreState.score == null ? (
              <View
                style={{
                  width: "100%",
                  borderRadius: 22,
                  backgroundColor: "#FFFFFF",
                  borderWidth: 1,
                  borderColor: "rgba(31,79,71,0.08)",
                  padding: 26,
                  alignItems: "center",
                  shadowColor: "#2E7268",
                  shadowOpacity: 0.08,
                  shadowRadius: 14,
                  shadowOffset: { width: 0, height: 6 },
                  elevation: 2,
                }}
              >
                <Text
                  style={{
                    fontFamily: "Italiana",
                    fontSize: 22,
                    color: "#2A2520",
                    textAlign: "center",
                    marginBottom: 6,
                  }}
                >
                  No Smile Score yet
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 12,
                    color: "#6E6457",
                    textAlign: "center",
                    marginBottom: 16,
                  }}
                >
                  Take the 7-question quiz so we can show you your snapshot.
                </Text>
                <Button
                  variant="primary"
                  size="md"
                  onPress={() => router.push("/smile-score")}
                >
                  Take the quiz
                </Button>
              </View>
            ) : (
              <>
                <SmileScoreGauge
                  score={scoreState.score}
                  band={band!.band}
                  bandLabel={band!.label}
                  size={220}
                />
                <View
                  style={{
                    marginTop: 18,
                    paddingVertical: 14,
                    paddingHorizontal: 18,
                    borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.65)",
                    borderWidth: 1,
                    borderColor: "rgba(31,79,71,0.08)",
                    width: "100%",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 13,
                      lineHeight: 18,
                      color: "#4D423A",
                      textAlign: "center",
                    }}
                  >
                    {band!.hint}
                  </Text>
                </View>
                <Pressable
                  onPress={() => router.push("/smile-score")}
                  hitSlop={10}
                  style={{ marginTop: 14 }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 11,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                      color: "#2E7268",
                      fontWeight: "600",
                    }}
                  >
                    Retake the quiz
                  </Text>
                </Pressable>
              </>
            )}
          </View>
        ) : (
          <View style={{ paddingHorizontal: 24, paddingTop: 28 }}>
            <View
              style={{
                borderRadius: 22,
                backgroundColor: "#FFFFFF",
                borderWidth: 1,
                borderColor: "rgba(31,79,71,0.08)",
                paddingVertical: 24,
                paddingHorizontal: 12,
                alignItems: "center",
                shadowColor: "#2E7268",
                shadowOpacity: 0.08,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 2,
              }}
            >
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 10,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  color: "#8A7E70",
                  marginBottom: 8,
                  fontWeight: "500",
                }}
              >
                Four photos for an accurate quote
              </Text>
              <Text
                style={{
                  fontFamily: "Italiana",
                  fontSize: 22,
                  color: "#2A2520",
                  textAlign: "center",
                  marginBottom: 16,
                  paddingHorizontal: 16,
                }}
              >
                What to capture
              </Text>
              <MouthArchDiagram regions={regions} size={300} />
            </View>

            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 11,
                color: "#8A7E70",
                textAlign: "center",
                marginTop: 16,
                paddingHorizontal: 24,
                lineHeight: 16,
              }}
            >
              No diagnoses, no AI detection. These are just the angles a dentist
              needs to write you an accurate quote.
            </Text>
          </View>
        )}

        {/* Start a quote CTA */}
        <View style={{ paddingHorizontal: 24, paddingTop: 24, alignItems: "center" }}>
          <Button
            variant="primary"
            size="lg"
            fullWidth
            rightSketch="arrow-right"
            onPress={() => router.push("/categories")}
          >
            Start a quote
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
