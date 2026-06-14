import { View, Text, Pressable } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { Icon, type IconName } from "./Icon";

/**
 * Editorial bottom tab bar for the patient flow.
 * Mounted at the bottom of root-level patient screens (home, categories, inbox).
 * The Stack-based router doesn't need <Tabs/>; this is a presentational shell
 * that calls router.push when tapped.
 */
type Tab = { key: string; label: string; icon: IconName; href: string };

const TABS: Tab[] = [
  { key: "home", label: "Home", icon: "spark", href: "/" },
  { key: "new", label: "New quote", icon: "camera", href: "/categories" },
  { key: "inbox", label: "Bookings", icon: "calendar", href: "/inbox" },
];

export function PatientTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const activeKey =
    pathname === "/" || pathname === ""
      ? "home"
      : pathname.startsWith("/inbox") || pathname.startsWith("/booking")
        ? "inbox"
        : pathname.startsWith("/categories") ||
            pathname.startsWith("/capture") ||
            pathname.startsWith("/symptoms") ||
            pathname.startsWith("/location") ||
            pathname.startsWith("/urgency")
          ? "new"
          : null;

  return (
    <View className="border-t border-linen bg-bone px-6 pt-3 pb-6">
      <View className="flex-row items-stretch justify-around">
        {TABS.map((t) => {
          const active = t.key === activeKey;
          return (
            <Pressable
              key={t.key}
              onPress={() => router.push(t.href as never)}
              className="flex-1 items-center py-1"
            >
              <View className="mb-1">
                <Icon
                  name={t.icon}
                  size={22}
                  color={active ? "#A9CFC0" : "#8A7E6F"}
                />
              </View>
              <Text
                className={`text-[10px] tracking-cap uppercase font-sans ${
                  active ? "text-gold" : "text-taupe"
                }`}
              >
                {t.label}
              </Text>
              {active ? (
                <View className="h-0.5 w-6 bg-gold mt-1.5 rounded-full" />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
