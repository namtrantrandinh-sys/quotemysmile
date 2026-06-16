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
              style={({ pressed }) => ({
                backgroundColor: pressed ? "#854C39" : "#9E5E47",
                borderRadius: 999,
                paddingVertical: 16,
                paddingHorizontal: 20,
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                shadowColor: "#5F2F22",
                shadowOpacity: 0.28,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 },
                elevation: 6,
              })}
            >
              <View
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 21,
                  backgroundColor: "rgba(255,255,255,0.22)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialCommunityIcons name="medical-bag" size={22} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 10,
                    letterSpacing: 1.6,
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.78)",
                    marginBottom: 2,
                    fontWeight: "500",
                  }}
                >
                  Emergency · NOW
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 16,
                    fontWeight: "600",
                    color: "#FFFFFF",
                    lineHeight: 20,
                    marginBottom: 2,
                  }}
                >
                  Pain, swelling, or broken tooth?
                </Text>
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 12,
                    color: "rgba(255,255,255,0.82)",
                    lineHeight: 16,
                  }}
                >
                  15-minute quote window. Same-day response.
                </Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color="#FFFFFF" />
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
