import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Switch, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  getMyClinic,
  updateMyClinic,
  createCustomerSetup,
  hasCardOnFile,
} from "@/lib/services/dentist";
import { signOut } from "@/lib/services/auth";
import { deleteMyAccount } from "@/lib/services/account";
import { useStripe } from "@stripe/stripe-react-native";
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

export default function DentistSettings() {
  const router = useRouter();
  const { profile } = useUserProfile();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoadError(null);
      const c = (await getMyClinic()) as unknown as Clinic | null;
      setClinic(c);
    } catch (e) {
      setLoadError(
        e instanceof Error
          ? e.message
          : "Couldn't load your clinic — check your connection and retry.",
      );
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const patch = async (input: Parameters<typeof updateMyClinic>[0], key: string) => {
    if (!clinic) return;
    setBusy(key);
    // Optimistic
    setClinic((c) => (c ? { ...c, ...mapPatch(input) } : c));
    try {
      await updateMyClinic(input);
    } catch (e) {
      Alert.alert("Couldn't save", e instanceof Error ? e.message : "Try again.");
      await load();
    } finally {
      setBusy(null);
    }
  };

  const toggleCategory = (id: CategoryId) => {
    if (!clinic) return;
    const has = clinic.categories.includes(id);
    const next = has
      ? clinic.categories.filter((c) => c !== id)
      : [...clinic.categories, id];
    if (next.length === 0) {
      Alert.alert("At least one", "Pick at least one category to keep receiving requests.");
      return;
    }
    void patch({ categories: next }, `cat-${id}`);
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete your account?",
      "This permanently removes your profile and clinic. Past bookings are kept anonymised. This cannot be undone.",
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
      <ScrollView>
        {loadError ? (
          <View className="mx-8 mt-4 border border-clay/40 bg-clay/5 p-4">
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
        <View className="px-8 pt-12 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            {clinic?.name ?? "Your clinic"}
          </Text>
          <Text className="font-display text-4xl text-espresso text-center mb-3">
            {profile?.full_name ?? "Dentist"}
          </Text>
          {profile?.ahpra_no ? (
            <VerifiedBadge ahpraNo={profile.ahpra_no} size="md" />
          ) : null}
        </View>

        {/* Self-pause */}
        <Group label="Availability">
          <ToggleRow
            label={clinic?.accepting ? "Accepting requests" : "Paused — not receiving"}
            value={!!clinic?.accepting}
            onChange={(v) => void patch({ accepting: v }, "accepting")}
            last
          />
          <Text className="text-xs text-taupe font-sans px-1 pt-3">
            When paused, you stop appearing in the patient broadcast. Existing
            bookings and quotes are unaffected.
          </Text>
        </Group>

        {/* Radius */}
        <Group label="Service radius">
          <View className="flex-row gap-2 py-2">
            {RADII.map((r) => {
              const sel = clinic?.service_radius_km === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => void patch({ serviceRadiusKm: r }, `r-${r}`)}
                  className={`flex-1 items-center py-3 border ${
                    sel ? "border-espresso bg-espresso" : "border-linen"
                  }`}
                >
                  <Text
                    className={`text-[11px] tracking-cap uppercase font-sans ${
                      sel ? "text-bone" : "text-walnut"
                    }`}
                  >
                    {r} km
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Group>

        {/* Categories */}
        <Group label="Categories you take">
          <View className="flex-row flex-wrap gap-2 py-2">
            {ALL_CATS.map((c) => {
              const sel = clinic?.categories.includes(c.id) ?? false;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => toggleCategory(c.id)}
                  className={`px-3 py-2 border ${
                    sel ? "border-gold bg-gold/10" : "border-linen"
                  }`}
                >
                  <Text
                    className={`text-[11px] tracking-cap uppercase font-sans ${
                      sel ? "text-gold" : "text-walnut"
                    }`}
                  >
                    {busy === `cat-${c.id}` ? "…" : c.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Group>

        {/* Clinic info */}
        <Group label="Clinic info">
          <Row label="Trading name" value={clinic?.name ?? "—"} />
          <Row label="Address" value={clinic?.address ?? "—"} />
          <Row
            label="AHPRA"
            value={
              profile?.ahpra_no
                ? `${profile.ahpra_no.slice(0, 3)}****${profile.ahpra_no.slice(-4)} · ${profile.ahpra_verified_at ? "Verified" : "Pending"}`
                : "—"
            }
          />
          <Row
            label="ABN"
            value={
              clinic?.abn
                ? `${clinic.abn}${clinic.abn_verified_at ? " · Verified" : " · Pending"}`
                : "—"
            }
            last
          />
        </Group>

        {/* Session */}
        <View className="px-8 pt-2 pb-4 items-center">
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
          <View className="border border-clay/30 bg-clay/5 p-5">
            <Text className="text-[11px] tracking-cap uppercase text-clay font-sans mb-3">
              Danger zone
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-4">
              Delete your QuoteMySmile account. Clinic + profile are removed;
              past bookings are kept anonymised for legal record.
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

function mapPatch(input: Parameters<typeof updateMyClinic>[0]): Partial<Clinic> {
  const out: Partial<Clinic> = {};
  if (input.serviceRadiusKm != null) out.service_radius_km = input.serviceRadiusKm;
  if (input.categories) out.categories = input.categories;
  if (input.phone !== undefined) out.phone = input.phone;
  if (input.accepting !== undefined) out.accepting = input.accepting;
  return out;
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="px-8 mb-10">
      <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
        {label}
      </Text>
      <View className="border-y border-linen py-2">{children}</View>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View
      className={`flex-row items-center justify-between py-4 ${
        last ? "" : "border-b border-linen"
      }`}
    >
      <Text className="font-sans text-sm text-walnut">{label}</Text>
      <Text className="font-sans text-sm text-espresso">{value}</Text>
    </View>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  last,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center justify-between py-4 ${
        last ? "" : "border-b border-linen"
      }`}
    >
      <Text className="font-sans text-sm text-walnut flex-1">{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: "#E5DCC8", true: "#A9CFC0" }}
        thumbColor={"#F5F1E8"}
      />
    </View>
  );
}
