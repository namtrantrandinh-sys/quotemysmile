import { View, Text, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { CategoryTile } from "@/components/CategoryTile";
import { CATEGORIES, GROUP_LABEL } from "@/lib/categories";
import type { CategoryGroup } from "@/lib/types";
import { setIntake } from "@/lib/intakeStore";
import { PatientTabBar } from "@/components/PatientTabBar";

const ORDER: CategoryGroup[] = ["common", "cosmetic", "restorative", "other"];

export default function CategoriesScreen() {
  const router = useRouter();

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Step 01 · Category" />
      <ScrollView>
        <View className="px-8 pt-16 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            What do you need
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-6">
            Choose a place to start.
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            Pick the closest fit. Not sure? Pick the last tile — your photos will guide the dentist.
          </Text>
        </View>

        <View className="px-8 pb-24">
          {ORDER.map((group) => {
            const items = CATEGORIES.filter((c) => c.group === group);
            if (items.length === 0) return null;
            return (
              <View key={group} className="mb-12">
                <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-5">
                  {GROUP_LABEL[group]}
                </Text>
                <View className="flex-row flex-wrap gap-3">
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
