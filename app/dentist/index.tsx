import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Wordmark } from "@/components/Wordmark";
import { LiveBadge } from "@/components/LiveBadge";
import { Button } from "@/components/Button";
import {
  listLiveNearbyRequests,
  subscribeNearbyRequests,
  getVerificationStatus,
  verifyCredentials,
  getMyAccruedFees,
} from "@/lib/services/dentist";
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

const FALLBACK = [
  { id: "req-1", category: "Filling + clean", closes_at: new Date(Date.now() + 28 * 60_000).toISOString() },
  { id: "req-2", category: "Crown consult", closes_at: new Date(Date.now() + 72 * 60_000).toISOString() },
];

export default function DentistDashboard() {
  const router = useRouter();
  const { profile } = useUserProfile();
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
    if (!profile?.ahpra_no) return;
    setRechecking(true);
    try {
      const v = await getVerificationStatus();
      await verifyCredentials({
        ahpraNo: profile.ahpra_no,
        expectedName: profile.full_name ?? "",
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
    <SafeAreaView className="flex-1 bg-bone">
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

        {/* Status block */}
        <View className="px-8 pt-12 pb-10 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Your clinic
          </Text>
          <Text className="font-display text-4xl text-espresso text-center mb-8">
            {profile?.full_name ?? "Dentist"}
          </Text>

          <View className="flex-row items-center gap-3 mb-10">
            <LiveBadge label="Active · accepting requests" />
          </View>

          <View className="border-y border-linen w-full max-w-md py-6 flex-row items-center justify-around">
            <Stat label="Quotes" value="24" />
            <Stat label="Booked" value="7" />
            <Stat label="Win rate" value="29%" />
          </View>
        </View>

        {/* Accrued platform fees this month */}
        <View className="px-8 pb-8">
          <View className="border border-gold/30 bg-gold/5 px-5 py-5">
            <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans mb-2">
              Platform fees · this month
            </Text>
            <View className="flex-row items-baseline gap-3 mb-2">
              <Text className="font-display text-4xl text-gold">
                ${((fees?.cents ?? 0) / 100).toFixed(2)}
              </Text>
              <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">
                · {fees?.bookings ?? 0} attended
              </Text>
            </View>
            <Text className="text-xs text-walnut font-sans leading-relaxed">
              A$5 per attended booking. Charged to your card on file at the
              end of the calendar month. No monthly fee, no per-quote fee.
            </Text>
          </View>
        </View>

        {/* Live requests */}
        <View className="px-8 pb-12">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            Live nearby · {list.length}
          </Text>

          {list.map((r) => {
            const minutesLeft = Math.max(
              0,
              Math.round((new Date(r.closes_at).getTime() - Date.now()) / 60_000),
            );
            return (
              <Pressable
                key={r.id}
                onPress={() => router.push({ pathname: "/dentist/request/[id]", params: { id: r.id } })}
                className="border border-linen bg-eggshell/40 px-6 py-6 mb-4 active:bg-eggshell"
              >
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans">
                    {minutesLeft} min left
                  </Text>
                  <LiveBadge label="Open" />
                </View>
                <Text className="font-sans text-sm text-walnut">{r.category}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Templates / settings */}
        <View className="px-8 pb-24 border-t border-linen pt-10 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-8">
            Manage
          </Text>
          <View className="gap-4 items-center">
            <Button variant="primary" size="md" onPress={() => router.push("/dentist/bookings")}>
              Clinic bookings
            </Button>
            <Button variant="secondary" size="md" onPress={() => router.push("/dentist/stats")}>
              View stats
            </Button>
            <Button variant="secondary" size="md" onPress={() => router.push("/dentist/settings")}>
              Settings
            </Button>
            <Button variant="secondary" size="md" onPress={() => router.push("/dentist/guide")}>
              How to quote · guide
            </Button>
            <Button variant="ghost" size="md" onPress={() => router.push("/dentist/won")}>
              Sample won notification
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="items-center">
      <Text className="font-display text-3xl text-gold">{value}</Text>
      <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-1">
        {label}
      </Text>
    </View>
  );
}
