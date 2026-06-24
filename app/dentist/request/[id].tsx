import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Alert,
  Image,
  Pressable,
  Modal,
  Dimensions,
  StatusBar,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { FieldLabel } from "@/components/FieldLabel";
import { TextField } from "@/components/TextField";
import {
  submitQuote,
  broadcastTyping,
  listQuotesForRequest,
} from "@/lib/services/quotes";
import { getMyClinic } from "@/lib/services/dentist";
import { getRequestForDentist } from "@/lib/services/requests";
import { signedPhotoUrl } from "@/lib/services/photos";
import { useUserProfile } from "@/hooks/useUserProfile";
import { scanNote } from "@/lib/ahpraFilter";
import { Checkbox } from "@/components/Checkbox";
import { SketchIcon } from "@/components/SketchIcon";

type CompetitorRow = {
  name: string;
  total: number;
};

const TEMPLATE_ITEMS = [
  { code: "011", label: "Comprehensive exam", amount: 75 },
  { code: "022", label: "X-ray, intraoral", amount: 45 },
  { code: "111", label: "Scale + clean", amount: 120 },
  { code: "531", label: "Composite filling", amount: 145 },
];

export default function IncomingRequestScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { dentist } = useUserProfile();
  const [phase, setPhase] = useState<"view" | "build" | "submitted">("view");
  const [items, setItems] = useState(TEMPLATE_ITEMS);
  const [note, setNote] = useState("");
  const [ack1, setAck1] = useState(false);
  const [ack2, setAck2] = useState(false);
  const [emergencyPremiumPct, setEmergencyPremiumPct] = useState(0);

  const baseTotal = items.reduce((s, it) => s + it.amount, 0);
  const premium = Math.round((baseTotal * emergencyPremiumPct) / 100);
  const total = baseTotal + premium;

  const [patientNote, setPatientNote] = useState<string>("");
  const [category, setCategory] = useState<string>("Filling + clean");
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [minutesLeft, setMinutesLeft] = useState<number>(28);
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [competitors, setCompetitors] = useState<CompetitorRow[]>([]);
  const [myClinicName, setMyClinicName] = useState<string>("");

  // AHPRA gate — the DB will reject the insert if status is not
  // active/conditional (trigger from migration 0027), but we surface the
  // gate up here so the dentist sees a clear "verify first" message
  // instead of a raw Postgres exception when they tap Submit.
  const ahpraStatus = dentist?.ahpra_status ?? "unknown";
  const verified = ahpraStatus === "active" || ahpraStatus === "conditional";

  // Broadcast typing presence when in the build phase
  useEffect(() => {
    if (phase !== "build" || !id || !dentist) return;
    const ch = broadcastTyping(id as string, dentist.full_name ?? "Dentist");
    return () => {
      (ch as any)?.unsubscribe?.();
    };
  }, [phase, id, dentist]);

  // Resolve the dentist's own clinic name once — used to label the "You"
  // row in the submitted state instead of a hardcoded demo string.
  useEffect(() => {
    let cancelled = false;
    getMyClinic()
      .then((c) => {
        if (cancelled) return;
        setMyClinicName(((c as { name?: string } | null)?.name ?? "Your clinic"));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the real live quotes already submitted for this request. Shown as
  // anonymised competitor rows ("Clinic A · $349") so the dentist gets a
  // sense of the going rate without exposing other clinics' names directly.
  // The open-feed marketplace already shows full names on the patient
  // side; here we show clinic_name_at_quote (set at submit time) trimmed
  // to first word, which keeps the field useful without leaking targets.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    listQuotesForRequest(id as string)
      .then((rows) => {
        if (cancelled) return;
        const list = (rows ?? []) as Array<{
          id: string;
          dentist_id: string;
          total: number | null;
          dentist_name_at_quote: string | null;
        }>;
        const mine = dentist?.user_id;
        const others = list
          .filter((q) => q.dentist_id !== mine && (q.total ?? 0) > 0)
          .map((q, i) => ({
            name: q.dentist_name_at_quote
              ? `Clinic ${String.fromCharCode(65 + i)}`
              : `Clinic ${String.fromCharCode(65 + i)}`,
            total: Math.round(Number(q.total ?? 0)),
          }))
          .slice(0, 6);
        setCompetitors(others);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, dentist?.user_id]);

  useEffect(() => {
    if (!id) return;
    getRequestForDentist(id as string)
      .then(async (row: any) => {
        if (!row) return;
        setCategory(row.category);
        setMinutesLeft(
          Math.max(0, Math.round((new Date(row.closes_at).getTime() - Date.now()) / 60_000)),
        );
        setQualityScore(row.photo_quality_score ?? null);
        const symptomNote =
          (row.symptom_json as { note?: string } | null)?.note ?? "";
        setPatientNote(symptomNote);
        const paths = (row.photo_urls as string[]) ?? [];
        // Sign every storage path; surface the first signing error so the
        // dentist sees a real reason (RLS denied, expired link, etc) rather
        // than silently rendering empty circles. Filter out failures from
        // the rendered list so one bad path doesn't blank the row.
        const signed = await Promise.all(
          paths.map(async (p) => {
            try {
              return await signedPhotoUrl(p, 3600);
            } catch (e) {
              return { error: e instanceof Error ? e.message : "Failed to sign" };
            }
          }),
        );
        const urls = signed.filter(
          (s): s is string => typeof s === "string",
        );
        const firstErr = signed.find(
          (s): s is { error: string } => typeof s !== "string",
        );
        setPhotoUrls(urls);
        if (paths.length > 0 && urls.length === 0 && firstErr) {
          setPhotoError(firstErr.error);
        } else {
          setPhotoError(null);
        }
      })
      .catch(() => {});
  }, [id]);

  const handleSubmit = async () => {
    if (!ack1 || !ack2) return;
    // Health-professional gate — only AHPRA-verified dentists can quote.
    // The DB trigger enforces the same rule (migration 0027); this client
    // check turns a raw exception into a friendly message.
    if (!verified) {
      Alert.alert(
        "Verification required",
        ahpraStatus === "suspended" || ahpraStatus === "not_found"
          ? "Your AHPRA registration is not active. You can't submit quotes until it's restored."
          : "We need to verify your AHPRA registration before you can quote. Open your dashboard and tap Recheck on the verification card.",
      );
      return;
    }
    const scan = scanNote(note);
    if (!scan.ok) {
      Alert.alert(
        "AHPRA — please revise your note",
        `These words can breach AHPRA advertising rules: ${scan.matches.join(", ")}.\n\nRemove or rephrase before submitting.`,
      );
      return;
    }
    try {
      if (dentist?.ahpra_no) {
        // Guard: a quote without a real name shows as "Dentist" on the
        // patient side. Refuse to submit until the dentist has a name on
        // file (set during onboarding).
        const dentistName = (dentist.full_name ?? "").trim();
        if (!dentistName) {
          Alert.alert(
            "Add your name",
            "Open Settings and add the name you'd like patients to see before quoting.",
          );
          return;
        }
        const clinic = await getMyClinic();
        if (!clinic) {
          Alert.alert("No clinic", "Finish onboarding to add a clinic first.");
          return;
        }
        await submitQuote({
          requestId: id as string,
          clinicId: (clinic as any).id,
          total,
          items,
          availabilitySlots: [new Date(Date.now() + 24 * 3600_000).toISOString()],
          note,
          ahpraNo: dentist.ahpra_no,
          ahpraRegType: (dentist.ahpra_reg_type as "General" | "Specialist") ?? "General",
          dentistNameAtQuote: dentistName,
          emergencyPremiumPct,
        });
      }
      setPhase("submitted");
    } catch (e) {
      Alert.alert("Couldn't submit", e instanceof Error ? e.message : "Try again.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title={`Live request · ${minutesLeft} min left`} />
      <ScrollView>
        {phase === "view" && (
          <View>
            <View className="px-8 pt-12 pb-8">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
                Patient nearby
              </Text>
              <Text className="font-display text-4xl text-espresso mb-2">
                Request
              </Text>
              <Text className="text-sm text-walnut font-sans">{category}</Text>
            </View>

            {patientNote ? (
              <View className="px-8 mb-10">
                <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
                  Patient note
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed italic">
                  "{patientNote}"
                </Text>
              </View>
            ) : null}

            <View className="px-8 mb-10">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans">
                  Photos · {photoUrls.length} attached
                </Text>
                {photoUrls.length > 0 ? (
                  <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
                    Tap to enlarge
                  </Text>
                ) : null}
              </View>

              {photoUrls.length > 0 ? (
                <View className="flex-row" style={{ gap: 10 }}>
                  {photoUrls.map((url, i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        aspectRatio: 1,
                        borderRadius: 14,
                        overflow: "hidden",
                        backgroundColor: "#EDE6D6",
                        borderWidth: 1,
                        borderColor: "rgba(31,79,71,0.10)",
                      }}
                    >
                    <Pressable
                      onPress={() => setLightboxIndex(i)}
                      style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                    >
                      <View style={{ width: "100%", height: "100%" }}>
                      <Image
                        source={{ uri: url }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                        onError={() =>
                          setPhotoError(
                            "Couldn't load one of the photos — the signed URL may have expired.",
                          )
                        }
                      />
                      {/* Magnify hint in bottom-right corner */}
                      <View
                        style={{
                          position: "absolute",
                          right: 6,
                          bottom: 6,
                          paddingHorizontal: 6,
                          paddingVertical: 4,
                          borderRadius: 6,
                          backgroundColor: "rgba(0,0,0,0.55)",
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <SketchIcon
                          name="magnify"
                          size={11}
                          color="#FFFFFF"
                          noGhost
                          strokeWidth={1.6}
                        />
                      </View>
                      </View>
                    </Pressable>
                    </View>
                  ))}
                </View>
              ) : (
                /* No-photo case is a WARNING, not a normal state. QMS
                   requires patients to attach at least one photo or
                   video; if a dentist sees this card, something went
                   wrong upstream (legacy row, failed signing, RLS deny)
                   and they shouldn't quote. */
                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(158,94,71,0.35)",
                    backgroundColor: "rgba(158,94,71,0.06)",
                    paddingVertical: 22,
                    paddingHorizontal: 18,
                    alignItems: "center",
                  }}
                >
                  <SketchIcon
                    name="emergency"
                    size={22}
                    color="#9E5E47"
                    noGhost
                    strokeWidth={1.6}
                  />
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 10,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                      color: "#9E5E47",
                      fontWeight: "700",
                      marginTop: 10,
                    }}
                  >
                    Photos missing
                  </Text>
                  <Text className="text-sm text-walnut font-sans mt-2 text-center leading-relaxed">
                    QMS requires every patient to attach at least one photo or
                    video. Don't quote this one — flag it and pass.
                  </Text>
                  {photoError ? (
                    <Text className="text-xs text-taupe font-sans mt-2 text-center">
                      Reason: {photoError}
                    </Text>
                  ) : null}
                </View>
              )}

              {photoError ? (
                <Text className="text-xs text-clay font-sans mt-3">
                  {photoError}
                </Text>
              ) : null}
              {qualityScore != null && photoUrls.length > 0 ? (
                <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mt-3">
                  Photo quality {qualityScore.toFixed(1)} / 5
                </Text>
              ) : null}
            </View>

            {/* Lightbox — fullscreen modal with swipe-to-dismiss feel.
                Tapping anywhere dismisses; arrows step between photos. */}
            <Modal
              visible={lightboxIndex !== null}
              transparent
              animationType="fade"
              onRequestClose={() => setLightboxIndex(null)}
            >
              <StatusBar barStyle="light-content" />
              <Pressable
                onPress={() => setLightboxIndex(null)}
                style={{
                  flex: 1,
                  backgroundColor: "rgba(0,0,0,0.92)",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {lightboxIndex !== null && photoUrls[lightboxIndex] ? (
                  <Image
                    source={{ uri: photoUrls[lightboxIndex] }}
                    style={{
                      width: Dimensions.get("window").width,
                      height: Dimensions.get("window").height * 0.8,
                    }}
                    resizeMode="contain"
                  />
                ) : null}

                {/* Counter + close pill (top) */}
                <View
                  style={{
                    position: "absolute",
                    top: 60,
                    left: 0,
                    right: 0,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    paddingHorizontal: 22,
                    alignItems: "center",
                  }}
                  pointerEvents="box-none"
                >
                  <View
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 999,
                      backgroundColor: "rgba(255,255,255,0.18)",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter",
                        fontSize: 11,
                        letterSpacing: 1.2,
                        textTransform: "uppercase",
                        color: "#FFFFFF",
                        fontWeight: "700",
                      }}
                    >
                      {(lightboxIndex ?? 0) + 1} / {photoUrls.length}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setLightboxIndex(null)}
                    hitSlop={12}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 18,
                      backgroundColor: "rgba(255,255,255,0.18)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        color: "#FFFFFF",
                        fontSize: 18,
                        fontWeight: "600",
                      }}
                    >
                      ×
                    </Text>
                  </Pressable>
                </View>

                {/* Prev/next arrows (only when there's more than one photo) */}
                {photoUrls.length > 1 ? (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 60,
                      left: 0,
                      right: 0,
                      flexDirection: "row",
                      justifyContent: "center",
                      gap: 22,
                    }}
                    pointerEvents="box-none"
                  >
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setLightboxIndex(
                          (i) =>
                            i === null
                              ? 0
                              : (i - 1 + photoUrls.length) % photoUrls.length,
                        );
                      }}
                      hitSlop={12}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: "rgba(255,255,255,0.18)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 22 }}>‹</Text>
                    </Pressable>
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation();
                        setLightboxIndex((i) =>
                          i === null ? 0 : (i + 1) % photoUrls.length,
                        );
                      }}
                      hitSlop={12}
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 26,
                        backgroundColor: "rgba(255,255,255,0.18)",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Text style={{ color: "#FFFFFF", fontSize: 22 }}>›</Text>
                    </Pressable>
                  </View>
                ) : null}
              </Pressable>
            </Modal>

            <View className="px-8 mb-10">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
                Currently quoting · {competitors.length}
              </Text>
              {competitors.length === 0 ? (
                <Text className="font-sans text-sm text-taupe italic">
                  No other quotes yet — you'd be first in.
                </Text>
              ) : (
                competitors.map((c) => (
                  <View
                    key={c.name}
                    className="flex-row items-center justify-between py-3 border-b border-linen"
                  >
                    <Text className="font-sans text-sm text-walnut">{c.name}</Text>
                    <Text className="font-display text-xl text-espresso">${c.total}</Text>
                  </View>
                ))
              )}
            </View>

            {!verified ? (
              <View className="px-8 mb-6">
                <View
                  style={{
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "rgba(158,94,71,0.35)",
                    backgroundColor: "rgba(158,94,71,0.06)",
                    paddingVertical: 18,
                    paddingHorizontal: 18,
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 10,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                      color: "#9E5E47",
                      fontWeight: "700",
                      marginBottom: 6,
                    }}
                  >
                    AHPRA verification required
                  </Text>
                  <Text className="text-sm text-walnut font-sans leading-relaxed">
                    {ahpraStatus === "suspended" || ahpraStatus === "not_found"
                      ? "Your AHPRA registration isn't active. Restore it before quoting."
                      : "Only AHPRA-verified dentists can quote on QuoteMySmile. Open the dashboard and tap Recheck (under a minute)."}
                  </Text>
                </View>
              </View>
            ) : null}

            <View className="px-8 pb-24 items-center gap-3">
              <Button
                variant="primary"
                size="lg"
                disabled={!verified}
                onPress={() => setPhase("build")}
              >
                {verified ? "Build my quote" : "Verification required"}
              </Button>
              {!verified ? (
                <Button
                  variant="secondary"
                  size="md"
                  onPress={() => router.push("/dentist")}
                >
                  Go to verification
                </Button>
              ) : null}
              <Button variant="ghost" size="md" onPress={() => router.back()}>
                Pass
              </Button>
            </View>
          </View>
        )}

        {phase === "build" && (
          <View>
            <View className="px-8 pt-12 pb-8">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
                Quote builder · template: filling + clean
              </Text>
              <Text className="font-display text-4xl text-espresso leading-[1.05]">
                Build your quote.
              </Text>
            </View>

            <View className="px-8 mb-10">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Line items · ADA codes
              </Text>
              {items.map((it, i) => (
                <View key={it.code} className="py-3 border-b border-linen">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="font-display text-sm text-taupe">{it.code}</Text>
                    <Text className="font-display text-xl text-espresso">${it.amount}</Text>
                  </View>
                  <Text className="font-sans text-sm text-walnut">{it.label}</Text>
                </View>
              ))}
            </View>

            {/* Emergency premium — transparent + capped */}
            <View className="px-8 mb-8">
              <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans mb-3">
                Emergency premium · {emergencyPremiumPct}%
              </Text>
              <View className="flex-row gap-2 mb-2">
                {[0, 15, 30, 50].map((p) => {
                  const sel = emergencyPremiumPct === p;
                  return (
                    <Pressable
                      key={p}
                      onPress={() => setEmergencyPremiumPct(p)}
                      className={`flex-1 items-center py-3 border ${
                        sel ? "border-gold bg-gold/10" : "border-linen"
                      }`}
                    >
                      <Text
                        className={`text-[11px] tracking-cap uppercase font-sans ${
                          sel ? "text-gold" : "text-walnut"
                        }`}
                      >
                        {p === 0 ? "None" : `+${p}%`}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text className="text-xs text-taupe font-sans leading-relaxed">
                For after-hours / same-day emergencies. Shown to the patient
                as a separate line — they see the uplift before booking. Capped
                at 50% to keep the marketplace honest.
              </Text>
            </View>

            <View className="px-8 mb-10 border-t border-b border-linen py-6">
              <View className="flex-row items-baseline justify-between">
                <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">
                  Base
                </Text>
                <Text className="font-display text-2xl text-walnut">
                  ${baseTotal}
                </Text>
              </View>
              {emergencyPremiumPct > 0 ? (
                <View className="flex-row items-baseline justify-between mt-2">
                  <Text className="text-[11px] tracking-cap uppercase text-clay font-sans">
                    Emergency uplift · {emergencyPremiumPct}%
                  </Text>
                  <Text className="font-display text-2xl text-clay">
                    +${premium}
                  </Text>
                </View>
              ) : null}
              <View className="flex-row items-baseline justify-between mt-3 pt-3 border-t border-linen">
                <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">
                  Total · indicative
                </Text>
                <Text className="font-display text-5xl text-gold">
                  ${total}
                </Text>
              </View>
            </View>

            <View className="px-8 mb-10">
              <FieldLabel
                label="Note to patient"
                hint="Optional, up to 200 characters. Avoid claims about outcomes, satisfaction, or guarantees."
              >
                <TextField
                  value={note}
                  onChangeText={setNote}
                  placeholder="Happy to smooth the sharp edge same-day."
                  multiline
                  maxLength={200}
                />
              </FieldLabel>
            </View>

            <View className="px-8 mb-12">
              <View className="border border-linen bg-eggshell/40 p-5">
                <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-3">
                  Before submitting
                </Text>
                <Checkbox
                  checked={ack1}
                  onToggle={() => setAck1(!ack1)}
                  label="I confirm this quote is based on patient photos only."
                />
                <Checkbox
                  checked={ack2}
                  onToggle={() => setAck2(!ack2)}
                  label="I accept full professional responsibility for this quote."
                />
              </View>
            </View>

            <View className="px-8 pb-24 items-center">
              <Button
                variant="primary"
                size="lg"
                onPress={handleSubmit}
              >
                Submit quote
              </Button>
            </View>
          </View>
        )}

        {phase === "submitted" && (
          <View className="items-center px-8 pt-24 pb-24">
            <View className="h-2 w-2 rounded-full bg-forest mb-12" />
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
              Live · visible to patient
            </Text>
            <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-8">
              Your quote is in.
            </Text>

            <View className="border-y border-linen w-full max-w-md py-8 items-center mb-10">
              <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-2">
                {myClinicName || "Your clinic"} · You
              </Text>
              <Text className="font-display text-5xl text-gold mb-1">${total}</Text>
              <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
                Requotes remaining · 1
              </Text>
            </View>

            <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed mb-12">
              You may requote once. After that your quote is final for this
              window.
            </Text>

            <View className="gap-3 items-center">
              <Button
                variant="primary"
                size="md"
                onPress={() => router.push({ pathname: "/dentist/requote/[id]", params: { id: String(id) } })}
              >
                Use my requote
              </Button>
              <Button variant="secondary" size="md" onPress={() => router.back()}>
                Back to dashboard
              </Button>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
