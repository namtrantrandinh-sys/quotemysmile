import { View, Text, ScrollView, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { CategoryTile } from "@/components/CategoryTile";
import { SketchIcon } from "@/components/SketchIcon";
import { CATEGORIES, GROUP_LABEL } from "@/lib/categories";
import type { CategoryGroup } from "@/lib/types";
import { setIntake } from "@/lib/intakeStore";
import { PatientTabBar } from "@/components/PatientTabBar";

// Emergency is surfaced separately at the top — not buried in the grid.
const ORDER: CategoryGroup[] = ["common", "cosmetic", "restorative", "other"];

// Chunk an array into pairs for a strict 2-column grid. The trailing
// odd item gets a `null` partner so the renderer can drop in a phantom
// spacer (keeps the lone tile at half-width instead of stretching it).
function chunkPairs<T>(items: T[]): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push([items[i], items[i + 1] ?? null]);
  }
  return rows;
}

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
          <View style={{ paddingHorizontal: 24, marginBottom: 28 }}>
            {/* Clay bg + shadow MUST sit on a wrapping View. The iOS
                Pressable function-style was intermittently dropping the
                backgroundColor — leaving white text on cream and the
                Emergency tile completely unreadable (user feedback:
                "EMERGECY IS WHITE and CAN HARDLY READ"). Hoisted the
                surface to a View so the clay always renders; the
                Pressable now only carries press-feedback opacity. */}
            <View
              style={{
                backgroundColor: "#9E5E47",
                borderRadius: 20,
                shadowColor: "#5F2F22",
                shadowOpacity: 0.32,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 8 },
                elevation: 7,
                overflow: "hidden",
              }}
            >
              <Pressable
                onPress={goToEmergency}
                android_ripple={{ color: "rgba(255,255,255,0.16)" }}
                style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
              >
                <View
                  style={{
                    paddingVertical: 16,
                    paddingHorizontal: 16,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(255,255,255,0.28)",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <SketchIcon name="emergency" size={24} color="#FFFFFF" noGhost />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.85}
                    style={{
                      fontFamily: "Inter",
                      fontSize: 10,
                      letterSpacing: 1.4,
                      textTransform: "uppercase",
                      color: "#FFFFFF",
                      marginBottom: 3,
                      fontWeight: "700",
                    }}
                  >
                    Emergency · NOW
                  </Text>
                  <Text
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                    style={{
                      fontFamily: "Inter",
                      fontSize: 15,
                      fontWeight: "700",
                      color: "#FFFFFF",
                      lineHeight: 19,
                      marginBottom: 3,
                    }}
                  >
                    Pain, swelling, or broken tooth?
                  </Text>
                  <Text
                    numberOfLines={2}
                    style={{
                      fontFamily: "Inter",
                      fontSize: 11.5,
                      color: "#FFFFFF",
                      lineHeight: 15,
                      fontWeight: "500",
                    }}
                  >
                    15-minute quote window. Same-day response.
                  </Text>
                </View>
                <SketchIcon name="chevron-right" size={20} color="#FFFFFF" noGhost />
                </View>
              </Pressable>
            </View>
          </View>
        ) : null}

        {/* Regular categories — strict 2-column grid (gap-based, not
            space-between). Horizontal padding bumped to 24 so the grid
            no longer kisses the screen edge (user feedback: "fitment
            of the phone display is too much to the edge of all
            buttons"). 24 leaves breathing room and still lets two
            tiles fit comfortably with 10pt gap on iPhone SE/mini. */}
        <View style={{ paddingHorizontal: 24, paddingBottom: 96 }}>
          {ORDER.map((group) => {
            const items = CATEGORIES.filter(
              (c) => c.group === group && c.id !== "emergency",
            );
            if (items.length === 0) return null;
            return (
              <View key={group} style={{ marginBottom: 28 }}>
                <Text
                  className="text-[11px] tracking-editorial uppercase text-taupe font-sans"
                  style={{ marginBottom: 12, paddingHorizontal: 4 }}
                >
                  {GROUP_LABEL[group]}
                </Text>
                {/* Chunk items into rows of 2 — each row uses flex:1 +
                    gap:10 so the two tiles divide the row exactly evenly
                    on any iPhone width (375 → 430pt). A trailing odd tile
                    gets a phantom spacer so it doesn't stretch full-width
                    and break the 2-up rhythm. */}
                {chunkPairs(items).map((pair, rowIdx) => (
                  <View
                    key={rowIdx}
                    style={{
                      flexDirection: "row",
                      gap: 10,
                      marginBottom: 10,
                    }}
                  >
                    {pair.map((c) =>
                      c ? (
                        <View key={c.id} style={{ flex: 1 }}>
                          <CategoryTile
                            c={c}
                            onPress={() => {
                              setIntake({ category: c.id });
                              router.push({
                                pathname: "/capture",
                                params: { c: c.id },
                              });
                            }}
                          />
                        </View>
                      ) : (
                        <View key="spacer" style={{ flex: 1 }} />
                      ),
                    )}
                  </View>
                ))}
              </View>
            );
          })}
        </View>
      </ScrollView>
      <PatientTabBar />
    </SafeAreaView>
  );
}
