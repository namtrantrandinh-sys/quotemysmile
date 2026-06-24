import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { BackBar } from "@/components/BackBar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { SketchIcon } from "@/components/SketchIcon";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  listMyClinics,
  updateClinic,
  deleteClinic,
} from "@/lib/services/dentist";
import { signOut } from "@/lib/services/auth";
import { deleteMyAccount } from "@/lib/services/account";
import {
  getPrefs,
  setPrefs,
  type NotificationPrefs,
} from "@/lib/notificationPrefs";
import type { CategoryId } from "@/lib/types";

type Clinic = {
  id: string;
  name: string;
  abn: string;
  address: string;
  service_radius_km: number;
  categories: CategoryId[];
  phone: string | null;
  accepting: boolean;
  verified: boolean;
  abn_verified_at: string | null;
  created_at: string;
};

const ALL_CATS: { id: CategoryId; label: string }[] = [
  { id: "filling-clean", label: "Filling + clean" },
  { id: "checkup-clean", label: "Check-up + clean" },
  { id: "whitening", label: "Whitening" },
  { id: "cosmetic", label: "Cosmetic" },
  { id: "crown-veneer", label: "Crown + veneer" },
  { id: "implant", label: "Implant" },
  { id: "wisdom", label: "Wisdom" },
  { id: "ortho", label: "Ortho" },
  { id: "emergency", label: "Emergency" },
];

const RADII = [5, 10, 15, 20, 30];

/**
 * Multi-clinic dentist settings.
 *
 * Many AU dentists practise at more than one clinic — a partner role at
 * one site, a casual or contractor day at another. The settings page
 * renders one card per clinic with independent controls (radius,
 * categories, accepting toggle) plus an "Add another practice" CTA at
 * the foot. AHPRA registration travels with the dentist (one row on
 * users); ABN + radius + categories are per-clinic.
 */
export default function DentistSettings() {
  const router = useRouter();
  const { dentist } = useUserProfile();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const load = async () => {
    try {
      setLoadError(null);
      const rows = (await listMyClinics()) as unknown as Clinic[];
      setClinics(rows);
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : "Couldn't load your clinics — check your connection and retry.",
      );
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const patch = async (
    clinicId: string,
    input: Parameters<typeof updateClinic>[1],
    key: string,
  ) => {
    setBusy(key);
    // Optimistic
    setClinics((rows) =>
      rows.map((c) => (c.id === clinicId ? { ...c, ...mapPatch(input) } : c)),
    );
    try {
      await updateClinic(clinicId, input);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1400);
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : "Try again.");
      await load();
    } finally {
      setBusy(null);
    }
  };

  const removeClinic = (c: Clinic) => {
    if (clinics.length <= 1) {
      Alert.alert(
        "Can't remove the last clinic",
        "You need at least one practice on file to keep receiving requests. Add another practice first, then remove this one.",
      );
      return;
    }
    Alert.alert(
      `Remove ${c.name}?`,
      "You'll stop receiving requests from this clinic's catchment. Past bookings stay intact.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setBusy(`del-${c.id}`);
            try {
              await deleteClinic(c.id);
              await load();
            } catch (e) {
              Alert.alert(
                "Couldn't remove",
                e instanceof Error ? e.message : "Try again.",
              );
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete your account?",
      "This permanently removes your profile and all your clinics. Past bookings are kept anonymised. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setBusy("delete");
            try {
              await deleteMyAccount();
              await signOut();
              router.replace("/");
            } catch (e) {
              Alert.alert("Couldn't delete", e instanceof Error ? e.message : "Try again.");
            } finally {
              setBusy(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Settings" />
      {savedFlash ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 100,
            alignSelf: "center",
            backgroundColor: "#2E7268",
            paddingHorizontal: 18,
            paddingVertical: 10,
            borderRadius: 22,
            zIndex: 50,
            shadowColor: "#2E7268",
            shadowOpacity: 0.2,
            shadowRadius: 12,
            shadowOffset: { width: 0, height: 4 },
            elevation: 6,
          }}
        >
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 12,
              letterSpacing: 0.6,
              color: "#FFFFFF",
              fontWeight: "600",
            }}
          >
            ✓ Saved
          </Text>
        </View>
      ) : null}
      <ScrollView>
        {/* Dentist header */}
        <View className="px-8 pt-12 pb-6 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Account
          </Text>
          <Text className="font-display text-4xl text-espresso text-center mb-3">
            {dentist?.full_name ?? "Dentist"}
          </Text>
          {dentist?.ahpra_no ? (
            <VerifiedBadge ahpraNo={dentist.ahpra_no} size="md" />
          ) : null}
        </View>

        {clinics.length === 0 && !loadError ? (
          <View className="mx-6 mt-2 mb-7">
            <LinearGradient
              colors={["#7BC5B5", "#4F9D8E", "#2E7268"]}
              locations={[0, 0.55, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 28,
                padding: 24,
                shadowColor: "#2E7268",
                shadowOpacity: 0.35,
                shadowRadius: 22,
                shadowOffset: { width: 0, height: 14 },
                elevation: 10,
              }}
            >
              {/* Medallion */}
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  backgroundColor: "rgba(255,255,255,0.16)",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.4)",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 16,
                }}
              >
                <SketchIcon name="map-pin" size={32} color="#FFFFFF" />
              </View>

              <Text
                style={{
                  fontSize: 10,
                  letterSpacing: 2.4,
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.85)",
                  marginBottom: 6,
                }}
                className="font-sans"
              >
                One last step
              </Text>
              <Text
                style={{
                  fontSize: 30,
                  lineHeight: 34,
                  color: "#FFFFFF",
                  marginBottom: 10,
                  letterSpacing: -0.5,
                }}
                className="font-display"
              >
                Open your{"\n"}first clinic
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  lineHeight: 20,
                  color: "rgba(255,255,255,0.92)",
                  marginBottom: 20,
                }}
                className="font-sans"
              >
                Add your address, ABN and the procedures you offer — quotes
                start landing the moment you're live.
              </Text>

              <View
                style={{
                  backgroundColor: "#FFFFFF",
                  borderRadius: 999,
                  shadowColor: "#000",
                  shadowOpacity: 0.12,
                  shadowRadius: 8,
                  shadowOffset: { width: 0, height: 4 },
                  overflow: "hidden",
                  alignSelf: "flex-start",
                }}
              >
                <Pressable
                  onPress={() => router.push("/dentist/onboarding")}
                  style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
                >
                  <View
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 22,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        letterSpacing: 2,
                        textTransform: "uppercase",
                        color: "#2E7268",
                        fontWeight: "700",
                      }}
                      className="font-sans"
                    >
                      Complete onboarding
                    </Text>
                    <Text
                      style={{
                        color: "#2E7268",
                        fontSize: 16,
                        marginLeft: 8,
                        fontWeight: "700",
                      }}
                    >
                      ›
                    </Text>
                  </View>
                </Pressable>
              </View>

              <Text
                style={{
                  fontSize: 11,
                  color: "rgba(255,255,255,0.7)",
                  marginTop: 14,
                  textAlign: "center",
                }}
                className="font-sans"
              >
                Takes about 2 minutes · ABN verified instantly
              </Text>
            </LinearGradient>
          </View>
        ) : null}

        {loadError ? (
          <View className="mx-8 mt-2 border border-clay/40 bg-clay/5 p-4 rounded-2xl">
            <Text className="text-[10px] tracking-cap uppercase text-clay font-sans mb-2">
              Couldn't load settings
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-3">
              {loadError}
            </Text>
            <Pressable onPress={load} className="self-start">
              <Text className="text-[11px] tracking-cap uppercase text-gold font-sans">
                Retry ›
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Practice section header */}
        {clinics.length > 0 ? (
          <View className="px-8 pt-2 pb-4 flex-row items-center justify-between">
            <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans">
              Your practices · {clinics.length}
            </Text>
            <Pressable
              onPress={() => router.push("/dentist/add-practice")}
              hitSlop={8}
            >
              <Text className="text-[11px] tracking-cap uppercase text-forest font-sans">
                + Add practice
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* One card per clinic */}
        {clinics.map((c, i) => (
          <ClinicCard
            key={c.id}
            clinic={c}
            isPrimary={i === 0}
            canRemove={clinics.length > 1}
            busy={busy}
            onPatch={(input, key) => patch(c.id, input, key)}
            onRemove={() => removeClinic(c)}
          />
        ))}

        {/* Win-notification preferences — control the celebration moment
            that fires every time a quote turns into a booking. Stored
            locally; doesn't gate the OS push (use iOS Settings for
            that), but does mute the in-app banner + sound + haptic. */}
        <View className="px-8 pb-2 pt-2">
          <WinNotificationCard />
        </View>

        {/* Add another practice CTA — full-width tile at the foot. */}
        {clinics.length > 0 ? (
          <View className="px-8 pb-8">
            <View
              style={{
                backgroundColor: "rgba(95,168,155,0.10)",
                borderWidth: 1.5,
                borderColor: "rgba(95,168,155,0.45)",
                borderStyle: "dashed",
                borderRadius: 18,
                overflow: "hidden",
              }}
            >
              <Pressable
                onPress={() => router.push("/dentist/add-practice")}
                style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
              >
                <View
                  style={{
                    paddingVertical: 22,
                    paddingHorizontal: 18,
                    alignItems: "center",
                    flexDirection: "row",
                    justifyContent: "center",
                    gap: 12,
                  }}
                >
                  <SketchIcon name="plus" size={18} color="#2E7268" noGhost strokeWidth={1.8} />
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 13,
                      letterSpacing: 1.2,
                      textTransform: "uppercase",
                      color: "#2E7268",
                      fontWeight: "700",
                    }}
                  >
                    Add another practice
                  </Text>
                </View>
              </Pressable>
            </View>
            <Text className="text-xs text-taupe font-sans text-center mt-3 leading-relaxed">
              Work at more than one clinic? Add each as its own practice and
              set its own radius + categories independently.
            </Text>
          </View>
        ) : null}

        {/* Session */}
        <View className="px-8 pt-4 pb-4 items-center">
          <Pressable
            onPress={async () => {
              setBusy("signout");
              try {
                await signOut();
                router.replace("/");
              } finally {
                setBusy(null);
              }
            }}
            className="py-4"
          >
            <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
              {busy === "signout" ? "Signing out…" : "Sign out"}
            </Text>
          </Pressable>
        </View>

        {/* Danger zone */}
        <View className="px-8 pb-24">
          <View className="border border-clay/30 bg-clay/5 p-5 rounded-2xl">
            <Text className="text-[11px] tracking-cap uppercase text-clay font-sans mb-3">
              Danger zone
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-4">
              Delete your QuoteMySmile account. Profile + all clinics are
              removed; past bookings are kept anonymised for legal record.
            </Text>
            <Pressable onPress={handleDelete}>
              <Text className="text-[11px] tracking-cap uppercase text-clay font-sans">
                {busy === "delete" ? "Deleting…" : "Delete my account"}
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ClinicCard({
  clinic,
  isPrimary,
  canRemove,
  busy,
  onPatch,
  onRemove,
}: {
  clinic: Clinic;
  isPrimary: boolean;
  canRemove: boolean;
  busy: string | null;
  onPatch: (input: Parameters<typeof updateClinic>[1], key: string) => void;
  onRemove: () => void;
}) {
  const toggleCategory = (id: CategoryId) => {
    const has = clinic.categories.includes(id);
    const next = has
      ? clinic.categories.filter((c) => c !== id)
      : [...clinic.categories, id];
    if (next.length === 0) {
      Alert.alert(
        "At least one",
        "Pick at least one category to keep receiving requests at this clinic.",
      );
      return;
    }
    onPatch({ categories: next }, `cat-${clinic.id}-${id}`);
  };

  return (
    <View className="px-8 mb-6">
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "rgba(31,79,71,0.10)",
          padding: 18,
          shadowColor: "#2E7268",
          shadowOpacity: 0.06,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 4 },
          elevation: 2,
        }}
      >
        {/* Header — clinic name + primary tag + accepting state */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            {isPrimary ? (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 9,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  color: "#2E7268",
                  fontWeight: "700",
                  marginBottom: 4,
                }}
              >
                Primary practice
              </Text>
            ) : (
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 9,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                  color: "#A89B88",
                  fontWeight: "700",
                  marginBottom: 4,
                }}
              >
                Additional practice
              </Text>
            )}
            <Text
              style={{
                fontFamily: "CormorantGaramond_700Bold",
                fontSize: 24,
                color: "#2E7268",
                letterSpacing: -0.3,
                fontWeight: "700",
              }}
              numberOfLines={2}
            >
              {clinic.name}
            </Text>
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 12,
                color: "#6E6457",
                marginTop: 4,
              }}
              numberOfLines={2}
            >
              {clinic.address}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 5,
              borderRadius: 999,
              backgroundColor: clinic.accepting
                ? "rgba(95,168,155,0.16)"
                : "rgba(158,94,71,0.14)",
            }}
          >
            <View
              style={{
                width: 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: clinic.accepting ? "#2E7268" : "#9E5E47",
              }}
            />
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 10,
                letterSpacing: 1.0,
                textTransform: "uppercase",
                color: clinic.accepting ? "#2E7268" : "#9E5E47",
                fontWeight: "700",
              }}
            >
              {clinic.accepting ? "Live" : "Paused"}
            </Text>
          </View>
        </View>

        {/* Self-pause toggle */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingVertical: 8,
            borderTopWidth: 1,
            borderTopColor: "rgba(31,79,71,0.08)",
          }}
        >
          <Text className="font-sans text-sm text-walnut flex-1">
            {clinic.accepting
              ? "Accepting requests at this clinic"
              : "Paused — not receiving requests here"}
          </Text>
          <Switch
            value={clinic.accepting}
            onValueChange={(v) =>
              onPatch({ accepting: v }, `accepting-${clinic.id}`)
            }
            trackColor={{ false: "#E5DCC8", true: "#A9CFC0" }}
            thumbColor={"#F5F1E8"}
          />
        </View>

        {/* Radius */}
        <View style={{ paddingTop: 14, paddingBottom: 4 }}>
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Service radius
          </Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {RADII.map((r) => {
              const sel = clinic.service_radius_km === r;
              return (
                <Pressable
                  key={r}
                  onPress={() =>
                    onPatch({ serviceRadiusKm: r }, `r-${clinic.id}-${r}`)
                  }
                  style={{
                    flex: 1,
                    alignItems: "center",
                    paddingVertical: 11,
                    minHeight: 40,
                    justifyContent: "center",
                    borderWidth: 1,
                    borderRadius: 10,
                    backgroundColor: sel ? "#2E7268" : "transparent",
                    borderColor: sel ? "#2E7268" : "rgba(31,79,71,0.18)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 11,
                      letterSpacing: 1.0,
                      textTransform: "uppercase",
                      color: sel ? "#FFFFFF" : "#2A2520",
                      fontWeight: "700",
                    }}
                  >
                    {r} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <Text className="text-xs text-taupe font-sans mt-2">
            Requests within {clinic.service_radius_km} km of this address
            appear in your live feed.
          </Text>
        </View>

        {/* Categories */}
        <View style={{ paddingTop: 18 }}>
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Categories at this clinic
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {ALL_CATS.map((cat) => {
              const sel = clinic.categories.includes(cat.id);
              return (
                <Pressable
                  key={cat.id}
                  onPress={() => toggleCategory(cat.id)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    minHeight: 36,
                    borderRadius: 999,
                    borderWidth: 1,
                    backgroundColor: sel ? "rgba(200,167,90,0.14)" : "transparent",
                    borderColor: sel ? "#C8A75A" : "rgba(31,79,71,0.18)",
                  }}
                >
                  <Text
                    style={{
                      fontFamily: "Inter",
                      fontSize: 11,
                      letterSpacing: 0.8,
                      textTransform: "uppercase",
                      color: sel ? "#8E7430" : "#6E6457",
                      fontWeight: "700",
                    }}
                  >
                    {busy === `cat-${clinic.id}-${cat.id}` ? "…" : cat.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Compliance row */}
        <View
          style={{
            marginTop: 18,
            paddingTop: 14,
            borderTopWidth: 1,
            borderTopColor: "rgba(31,79,71,0.08)",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 10,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                color: "#A89B88",
                fontWeight: "600",
              }}
            >
              ABN
            </Text>
            <Text className="font-sans text-sm text-espresso mt-1">
              {clinic.abn}
              {clinic.abn_verified_at ? " · Verified" : " · Pending"}
            </Text>
          </View>
          {canRemove ? (
            <Pressable
              onPress={onRemove}
              hitSlop={8}
              style={{ paddingVertical: 6, paddingHorizontal: 6 }}
            >
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 11,
                  letterSpacing: 1.0,
                  textTransform: "uppercase",
                  color: "#9E5E47",
                  fontWeight: "700",
                }}
              >
                {busy === `del-${clinic.id}` ? "Removing…" : "Remove"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function mapPatch(input: Parameters<typeof updateClinic>[1]): Partial<Clinic> {
  const out: Partial<Clinic> = {};
  if (input.serviceRadiusKm != null) out.service_radius_km = input.serviceRadiusKm;
  if (input.categories) out.categories = input.categories;
  if (input.phone !== undefined) out.phone = input.phone;
  if (input.accepting !== undefined) out.accepting = input.accepting;
  return out;
}

/**
 * Three toggles controlling the win-celebration moment:
 *   • Push  — when a booking comes in (server-respected eventually;
 *             today just mutes the in-app banner that opens on the
 *             "won" screen).
 *   • Sound — the ka-ching arpeggio inside WinCelebration.
 *   • Haptic — the success notification buzz.
 *
 * Persisted to AsyncStorage via lib/notificationPrefs so the prefs
 * survive reloads and apply across the patient + dentist celebration
 * moments on the same device.
 */
function WinNotificationCard() {
  const [prefs, setLocalPrefs] = useState<NotificationPrefs | null>(null);
  useEffect(() => {
    void getPrefs().then(setLocalPrefs);
  }, []);

  const update = async (patch: Partial<NotificationPrefs>) => {
    const next = await setPrefs(patch);
    setLocalPrefs(next);
  };

  if (!prefs) return null;

  return (
    <View
      style={{
        backgroundColor: "#FFFFFF",
        borderRadius: 18,
        borderWidth: 1,
        borderColor: "rgba(31,79,71,0.10)",
        paddingHorizontal: 20,
        paddingVertical: 18,
        shadowColor: "#2E7268",
        shadowOpacity: 0.05,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 6,
        }}
      >
        <SketchIcon name="sparkle" size={16} color="#2E7268" noGhost strokeWidth={1.8} />
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 11,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: "#2E7268",
            fontWeight: "700",
          }}
        >
          Win celebrations
        </Text>
      </View>
      <Text className="text-xs text-walnut font-sans leading-relaxed mb-3">
        We celebrate every booking with a quick confetti moment so wins
        feel like wins. Tune the sound + buzz to suit your day.
      </Text>

      <PrefRow
        title="Win push notification"
        subtitle="Tells you the moment a quote becomes a booking."
        value={prefs.winPush}
        onChange={(v) => void update({ winPush: v })}
      />
      <PrefRow
        title="Ka-ching sound"
        subtitle="Plays a short celebratory chime on each booking."
        value={prefs.winSound}
        onChange={(v) => void update({ winSound: v })}
      />
      <PrefRow
        title="Win haptic"
        subtitle="Success buzz on the phone when a booking lands."
        value={prefs.winHaptic}
        onChange={(v) => void update({ winHaptic: v })}
        last
      />
    </View>
  );
}

function PrefRow({
  title,
  subtitle,
  value,
  onChange,
  last,
}: {
  title: string;
  subtitle: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View
      style={{
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(31,79,71,0.08)",
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        ...(last ? {} : {}),
      }}
    >
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontFamily: "Inter",
            fontSize: 14,
            color: "#2A2520",
            fontWeight: "600",
            marginBottom: 2,
          }}
        >
          {title}
        </Text>
        <Text className="text-xs text-taupe font-sans leading-relaxed">
          {subtitle}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#D8D2C4", true: "#7BC5B5" }}
        thumbColor={value ? "#2E7268" : "#FFFFFF"}
        ios_backgroundColor="#D8D2C4"
      />
    </View>
  );
}
