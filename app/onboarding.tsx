import { useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "@/components/Button";
import { Wordmark } from "@/components/Wordmark";
import { Icon, type IconName } from "@/components/Icon";
import { markOnboardingSeen } from "@/lib/firstLaunch";

const { width } = Dimensions.get("window");

type Panel = {
  icon: IconName;
  kicker: string;
  title: string;
  italicWord?: string;
  body: string;
};

const PANELS: Panel[] = [
  {
    icon: "spark",
    kicker: "00 · The whole idea",
    title: "Dentists compete.",
    italicWord: "compete.",
    body:
      "AHPRA-registered dentists near you compete to give you the best quote — live, on your screen. You pick the one that suits.",
  },
  {
    icon: "phone",
    kicker: "01 · Why this exists",
    title: "No awkward phone calls.",
    italicWord: "calls.",
    body:
      "No \"call us for a price\" loops. No in-person quote reveals. Real prices, live, on your screen — accurate and competitive.",
  },
  {
    icon: "mouth",
    kicker: "02 · Map your mouth",
    title: "Four guided photos.",
    italicWord: "photos.",
    body:
      "Front smile, upper arch, lower arch, problem area. Our on-camera guides tell you exactly how to frame each one.",
  },
  {
    icon: "radius",
    kicker: "03 · Set your radius",
    title: "Pick your radius.",
    italicWord: "radius.",
    body:
      "GPS picks up your location. Drag the slider 2–30 km. See the real count of AHPRA-registered dentists in range.",
  },
  {
    icon: "clock",
    kicker: "04 · Live quoting",
    title: "Watch quotes arrive.",
    italicWord: "arrive.",
    body:
      "Dentists send indicative quotes within your window — 15 minutes for emergencies, up to three days for considered work. Each only allowed one revision.",
  },
  {
    icon: "check",
    kicker: "05 · Book with confidence",
    title: "Pick the quote that suits.",
    italicWord: "suits.",
    body:
      "Compare on price, distance, availability and reviews. Each quote is signed by an AHPRA-registered dentist — what you see is what you pay. The clinical exam confirms it, not changes it.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / width);
    if (i !== index) setIndex(i);
  };

  const goNext = () => {
    if (index < PANELS.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * width, animated: true });
    } else {
      finish();
    }
  };

  const skip = () => {
    finish();
  };

  const finish = async () => {
    await markOnboardingSeen();
    router.replace("/");
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      {/* Top */}
      <View className="px-8 py-5 flex-row items-center justify-between border-b border-linen">
        <Wordmark size="sm" />
        <Pressable onPress={skip}>
          <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
            Skip
          </Text>
        </Pressable>
      </View>

      {/* Carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {PANELS.map((p, i) => (
          <View
            key={i}
            style={{ width }}
            className="items-center justify-center px-10"
          >
            <View className="mb-10">
              <Icon name={p.icon} size={72} />
            </View>
            <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-10">
              {p.kicker}
            </Text>
            <Text className="font-display text-6xl text-espresso text-center leading-[1] mb-2">
              {p.title.split(" ").slice(0, -1).join(" ")}
            </Text>
            <Text className="font-display italic text-6xl text-gold text-center leading-[1.05] mb-12">
              {p.italicWord ?? p.title.split(" ").slice(-1)[0]}
            </Text>
            <Text className="text-base text-walnut font-sans text-center leading-relaxed max-w-md">
              {p.body}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom controls */}
      <View className="px-8 py-8 border-t border-linen">
        <View className="flex-row items-center justify-center gap-2 mb-6">
          {PANELS.map((_, i) => (
            <View
              key={i}
              className={
                i === index ? "w-8 h-1.5 bg-gold rounded-full" : "w-1.5 h-1.5 bg-linen rounded-full"
              }
            />
          ))}
        </View>
        <View className="items-center">
          <Button variant="primary" size="lg" onPress={goNext}>
            {index < PANELS.length - 1 ? "Continue" : "Get started"}
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
