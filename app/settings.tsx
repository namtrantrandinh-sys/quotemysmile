import { useState } from "react";
import { View, Text, ScrollView, Alert, Linking } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { useUserProfile } from "@/hooks/useUserProfile";
import { signOut } from "@/lib/services/auth";
import { deleteMyAccount } from "@/lib/services/account";
import { breadcrumb } from "@/lib/observability";
import { PatientTabBar } from "@/components/PatientTabBar";

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, loading } = useUserProfile();
  const [busy, setBusy] = useState<"signout" | "delete" | null>(null);

  const handleSignOut = async () => {
    setBusy("signout");
    try {
      breadcrumb("auth", "settings.signOut");
      await signOut();
      router.replace("/");
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      "Delete your account?",
      "This permanently removes your profile, photos, location, and push token. Bookings are kept (anonymised) for legal record. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete account",
          style: "destructive",
          onPress: () =>
            Alert.alert(
              "Are you absolutely sure?",
              "Last chance — tap Delete to confirm.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: async () => {
                    setBusy("delete");
                    try {
                      breadcrumb("auth", "settings.deleteAccount");
                      await deleteMyAccount();
                      await signOut();
                      router.replace("/");
                    } catch (e) {
                      Alert.alert(
                        "Couldn't delete account",
                        e instanceof Error
                          ? e.message
                          : "Email support@quotemysmile.com.au and we'll process it manually.",
                      );
                    } finally {
                      setBusy(null);
                    }
                  },
                },
              ],
            ),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Settings" />
      <ScrollView>
        <View className="px-8 pt-12 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            Account
          </Text>
          <Text className="font-display text-4xl text-espresso text-center leading-[1.05] mb-2">
            {profile?.full_name ?? (loading ? "" : "Guest")}
          </Text>
          {profile?.email ? (
            <Text className="text-sm text-walnut font-sans">{profile.email}</Text>
          ) : null}
          {profile?.phone ? (
            <Text className="text-xs text-taupe font-sans mt-1">
              {profile.phone}
            </Text>
          ) : null}
        </View>

        {/* Profile */}
        <Section title="Profile">
          <Row label="Name" value={profile?.full_name ?? "—"} />
          <Row label="Email" value={profile?.email ?? "—"} />
          <Row label="Mobile" value={profile?.phone ?? "—"} />
          <Row
            label="Role"
            value={profile?.role ? profile.role[0].toUpperCase() + profile.role.slice(1) : "—"}
          />
        </Section>

        {/* Legal + support */}
        <Section title="Legal · support">
          <LinkRow
            label="Privacy policy"
            onPress={() => router.push("/legal/privacy")}
          />
          <LinkRow
            label="Terms of service"
            onPress={() => router.push("/legal/terms")}
          />
          <LinkRow
            label="Contact support"
            onPress={() =>
              Linking.openURL("mailto:support@quotemysmile.com.au").catch(() => {})
            }
          />
        </Section>

        {/* Session */}
        <View className="px-8 pt-4 pb-4 gap-3 items-center">
          <Button
            variant="secondary"
            size="md"
            onPress={handleSignOut}
          >
            {busy === "signout" ? "Signing out…" : "Sign out"}
          </Button>
        </View>

        {/* Danger zone */}
        <View className="px-8 pt-10 pb-32">
          <View className="border border-clay/30 bg-clay/5 p-5">
            <Text className="text-[11px] tracking-cap uppercase text-clay font-sans mb-3">
              Danger zone
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed mb-5">
              Delete your QuoteMySmile account. We immediately wipe your
              photos, location, push token, and profile. Booking records are
              retained anonymised for legal and tax purposes.
            </Text>
            <Button
              variant="ghost"
              size="md"
              onPress={handleDelete}
            >
              {busy === "delete" ? "Deleting…" : "Delete my account"}
            </Button>
          </View>
        </View>
      </ScrollView>
      <PatientTabBar />
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-10">
      <Text className="px-8 text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
        {title}
      </Text>
      <View className="px-8 border-y border-linen bg-eggshell/30">
        {children}
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-linen last:border-b-0">
      <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
        {label}
      </Text>
      <Text className="font-sans text-sm text-walnut">{value}</Text>
    </View>
  );
}

function LinkRow({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between py-4 border-b border-linen last:border-b-0">
      <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
        {label}
      </Text>
      <Text
        onPress={onPress}
        className="text-[11px] tracking-cap uppercase text-gold font-sans"
      >
        Open ›
      </Text>
    </View>
  );
}
