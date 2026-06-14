import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { PLATFORM_LIABILITY } from "@/lib/copy";

const SECTIONS = [
  {
    h: "1. About these terms",
    p: "These Terms govern your use of QuoteMySmile. By using the platform you agree to them. We may update them with reasonable notice in-app.",
  },
  {
    h: "2. What QuoteMySmile is",
    p: PLATFORM_LIABILITY,
  },
  {
    h: "3. Indicative quotes",
    p: "Every quote on QuoteMySmile is indicative, based on the photos and information you provide. Quote accuracy depends on photo quality. Final fees, treatment, and clinical decisions are confirmed at your in-person clinical examination.",
  },
  {
    h: "4. Dentists are independent",
    p: "Dentists who quote on QuoteMySmile are independent professionals, registered with AHPRA. Each dentist is solely responsible for the quotes, opinions and treatment they provide. The dentist–patient relationship is between you and the dentist you choose.",
  },
  {
    h: "5. AHPRA advertising compliance",
    p: "Dentists agree not to make claims that breach AHPRA advertising guidelines on this platform — no testimonials, no guarantees, no outcome promises. We may suspend listings that breach this requirement.",
  },
  {
    h: "6. Bookings and cancellation",
    p: "Booking a consult does not commit you to treatment. You may cancel up to 24 hours before your consult without charge unless otherwise stated by the dentist. Late cancellation policies are set by individual clinics.",
  },
  {
    h: "7. Payments",
    p: "Consult bookings via QuoteMySmile are currently free. Treatment is paid directly to the clinic. We may introduce optional paid features in the future with clear notice.",
  },
  {
    h: "8. Complaints",
    p: "Clinical complaints should be raised first with the dentist or clinic. You may also contact your state's Health Complaints Commissioner or AHPRA. Platform complaints: support@quotemysmile.com.au.",
  },
  {
    h: "9. Limitation",
    p: "To the maximum extent permitted by Australian Consumer Law, our liability is limited to the resupply of the services. Nothing in these Terms excludes any consumer rights you have under Australian Consumer Law.",
  },
  {
    h: "10. Governing law",
    p: "These Terms are governed by the laws of Victoria, Australia.",
  },
];

export default function TermsScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Terms" />
      <ScrollView>
        <View className="px-8 pt-12 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            QuoteMySmile · Terms of Service
          </Text>
          <Text className="font-display text-4xl text-espresso text-center leading-[1.05]">
            The fine print.
          </Text>
          <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans mt-6">
            Last updated 14 June 2026
          </Text>
        </View>

        <View className="px-8 pb-24">
          {SECTIONS.map((s) => (
            <View key={s.h} className="mb-10">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
                {s.h}
              </Text>
              <Text className="text-base text-walnut font-sans leading-relaxed">{s.p}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
