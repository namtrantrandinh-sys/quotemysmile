import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BackBar } from "@/components/BackBar";
import { CategoryTile } from "@/components/CategoryTile";
import { CATEGORIES, GROUP_LABEL } from "@/lib/categories";
import type { CategoryGroup } from "@/lib/types";
import { setIntake } from "@/lib/intakeStore";
import { PatientTabBar } from "@/components/PatientTabBar";

// Emergency is surfaced separately at the top — not buried in the grid.
const ORDER: CategoryGroup[] = ["common", "cosmetic", "restorative", "other"];

export default function CategoriesScreen() {
  const router = useRouter();
  const emergency = CATEGORIES.find((c) => c.id === "emergency");

  const goToEmergency = () => {
    if (!emergency) return;
    setIntake({ category: emergency.id, urgency: "emergency" });
    router.push({ pathname: "/capture", params: { c: emergency.id } });
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Step 01 · Category" />
      <ScrollView>
        <View className="px-8 pt-12 pb-6 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-5">
            What do you need
          </Text>
          <Text className="font-display text-4xl text-espresso text-center leading-[1.1] mb-4">
            Choose a place to start.
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            Pick the closest fit. Not sure? Choose the last tile — your photos
            will guide the dentist.
          </Text>
        </View>

        {/* Emergency CTA — full-width, red accent, clear "act now" affordance.
            Sits ABOVE all other categories so a patient in pain finds it
            immediately, doesn't have to scan the grid. */}
        {emergency ? (
          <View className="px-8 mb-8">
            <Pressable
              onPress={goToEmergency}
              className="border-2 border-clay bg-clay/5 active:bg-clay/15 rounded-md px-5 py-5 flex-row items-center gap-4"
            >
              <View className="w-11 h-11 rounded-full bg-clay items-center justify-center">
                <MaterialCommunityIcons name="medical-bag" size={22} color="#FFFFFF" />
              </View>
              <View className="flex-1">
                <Text className="text-[10px] tracking-cap uppercase text-clay font-sans mb-0.5">
                  Emergency · NOW
                </Text>
                <Text className="font-display text-xl text-espresso leading-tight mb-0.5">
                  Pain, swelling, or broken tooth?
                </Text>
                <Text className="text-xs text-walnut font-sans leading-snug">
                  15-minute quote window. Dentists respond same-day.
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#9E5E47" />
            </Pressable>
          </View>
        ) : null}

        {/* Regular categories — uniform 2-column grid, every tile same size */}
        <View className="px-8 pb-24">
          {ORDER.map((group) => {
            const items = CATEGORIES.filter(
              (c) => c.group === group && c.id !== "emergency",
            );
            if (items.length === 0) return null;
            return (
              <View key={group} className="mb-8">
                <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
                  {GROUP_LABEL[group]}
                </Text>
                <View className="flex-row flex-wrap justify-between">
                  {items.map((c) => (
                    <CategoryTile
                      key={c.id}
                      c={c}
                      onPress={() => {
                        setIntake({ category: c.id });
                        router.push({ pathname: "/capture", params: { c: c.id } });
                      }}
                    />
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <PatientTabBar />
    </SafeAreaView>
  );
}
