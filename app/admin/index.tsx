import { useEffect, useState } from "react";
import { View, Text, ScrollView, Alert, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  listPendingClinics,
  verifyClinic,
  listFlaggedNotes,
  listAhpraQueue,
  forceRecheckAhpra,
  blockDentist,
  type AhpraQueueRow,
} from "@/lib/services/admin";

type Clinic = { id: string; name: string; abn: string; address: string; created_at: string };
type Flag = { id: number; payload: { quote_id: string; matches: string[] }; ts: string };

export default function AdminScreen() {
  const router = useRouter();
  const { isAdmin } = useUserProfile();
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [flags, setFlags] = useState<Flag[]>([]);
  const [queue, setQueue] = useState<AhpraQueueRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const reload = async () => {
    try {
      const [c, f, q] = await Promise.all([
        listPendingClinics(),
        listFlaggedNotes(),
        listAhpraQueue(),
      ]);
      setClinics(c as Clinic[]);
      setFlags(f as Flag[]);
      setQueue(q);
    } catch (e) {
      // RLS will block non-admin
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Admin" />
      <ScrollView>
        <View className="px-8 pt-12 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Internal · review queue
          </Text>
          <Text className="font-display text-4xl text-espresso text-center leading-[1.05] mb-4">
            Verification queue.
          </Text>
          <Pressable
            onPress={() => router.push("/admin/events")}
            className="pt-2"
          >
            <Text className="text-[11px] tracking-cap uppercase text-gold font-sans">
              Open event stream ›
            </Text>
          </Pressable>
        </View>

        {!isAdmin ? (
          <View className="px-8 py-16 items-center">
            <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
              You don't have admin access. To bootstrap the first admin, run in
              the Supabase SQL editor:
              {"\n\n"}
              <Text className="font-display text-walnut">
                update public.users set role='admin' where id='&lt;your-uuid&gt;';
              </Text>
            </Text>
          </View>
        ) : (
          <>
            {/* AHPRA verification queue */}
            <View className="px-8 mb-12">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                AHPRA queue · {queue.length}
              </Text>
              {queue.length === 0 ? (
                <Text className="text-sm text-taupe font-sans">All clear.</Text>
              ) : (
                queue.map((row) => {
                  const tone =
                    row.ahpra_status === "suspended" ||
                    row.ahpra_status === "not_found"
                      ? "border-clay/40 bg-clay/5"
                      : row.ahpra_status === "conditional"
                        ? "border-gold/40 bg-gold/5"
                        : "border-linen bg-eggshell/40";
                  return (
                    <View
                      key={row.id}
                      className={`border ${tone} px-5 py-5 mb-3`}
                    >
                      <View className="flex-row items-center justify-between mb-1">
                        <Text className="font-display text-lg text-espresso">
                          {row.full_name}
                        </Text>
                        <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
                          {row.ahpra_status.replace("_", " ")}
                        </Text>
                      </View>
                      <Text className="text-xs text-taupe font-sans mb-1">
                        AHPRA {row.ahpra_no ?? "—"}
                        {row.ahpra_reg_type ? ` · ${row.ahpra_reg_type}` : ""}
                      </Text>
                      <Text className="text-xs text-walnut font-sans mb-3">
                        {row.clinic_name ?? "—"}
                        {row.clinic_abn ? ` · ABN ${row.clinic_abn}` : ""}
                      </Text>
                      <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-3">
                        {row.ahpra_last_checked_at
                          ? `Last check ${new Date(row.ahpra_last_checked_at).toLocaleString("en-AU")}`
                          : "Never checked"}
                      </Text>
                      <View className="flex-row gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onPress={async () => {
                            if (!row.ahpra_no) return;
                            setBusy(row.id);
                            try {
                              await forceRecheckAhpra(row.id, row.ahpra_no);
                              await reload();
                            } catch (e) {
                              Alert.alert(
                                "Recheck failed",
                                e instanceof Error ? e.message : "Try again.",
                              );
                            } finally {
                              setBusy(null);
                            }
                          }}
                        >
                          {busy === row.id ? "Checking…" : "Recheck"}
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onPress={() => {
                            Alert.alert(
                              "Block this dentist?",
                              "They will be moved to 'suspended' and cannot submit quotes. Use only when you have off-platform evidence.",
                              [
                                { text: "Cancel", style: "cancel" },
                                {
                                  text: "Block",
                                  style: "destructive",
                                  onPress: async () => {
                                    setBusy(row.id);
                                    try {
                                      await blockDentist(
                                        row.id,
                                        "Admin manual block",
                                      );
                                      await reload();
                                    } catch (e) {
                                      Alert.alert(
                                        "Block failed",
                                        e instanceof Error ? e.message : "Try again.",
                                      );
                                    } finally {
                                      setBusy(null);
                                    }
                                  },
                                },
                              ],
                            );
                          }}
                        >
                          Block
                        </Button>
                      </View>
                    </View>
                  );
                })
              )}
            </View>

            <View className="px-8 mb-12">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Pending clinics · {clinics.length}
              </Text>
              {clinics.length === 0 ? (
                <Text className="text-sm text-taupe font-sans">All caught up.</Text>
              ) : (
                clinics.map((c) => (
                  <View
                    key={c.id}
                    className="border border-linen bg-eggshell/40 px-5 py-5 mb-3"
                  >
                    <Text className="font-display text-lg text-espresso mb-1">{c.name}</Text>
                    <Text className="text-xs text-taupe font-sans mb-1">ABN {c.abn}</Text>
                    <Text className="text-xs text-walnut font-sans mb-4">{c.address}</Text>
                    <View className="flex-row gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onPress={async () => {
                          try {
                            await verifyClinic(c.id);
                            await reload();
                          } catch (e) {
                            Alert.alert(
                              "Verify failed",
                              e instanceof Error ? e.message : "Try again",
                            );
                          }
                        }}
                      >
                        Approve
                      </Button>
                    </View>
                  </View>
                ))
              )}
            </View>

            <View className="px-8 pb-24">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Flagged quote notes · {flags.length}
              </Text>
              {flags.length === 0 ? (
                <Text className="text-sm text-taupe font-sans">No flagged notes.</Text>
              ) : (
                flags.map((f) => (
                  <View
                    key={f.id}
                    className="border border-linen bg-eggshell/40 px-5 py-4 mb-3"
                  >
                    <Text className="text-[10px] tracking-cap uppercase text-clay font-sans mb-2">
                      Quote {f.payload.quote_id.slice(0, 8)}
                    </Text>
                    <Text className="font-sans text-sm text-walnut">
                      Banned terms: {f.payload.matches.join(", ")}
                    </Text>
                    <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-2">
                      {new Date(f.ts).toLocaleString("en-AU")}
                    </Text>
                  </View>
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
