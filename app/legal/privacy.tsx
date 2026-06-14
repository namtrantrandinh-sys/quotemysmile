import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";

const SECTIONS = [
  {
    h: "Who we are",
    p: "QuoteMySmile is an independent Australian marketplace operated under [ABN PLACEHOLDER] (\"we\", \"us\"). We help patients receive indicative quotes from AHPRA-registered Australian dental practitioners (\"dentists\") for in-person clinical care.",
  },
  {
    h: "What we collect",
    p: "Account: name, mobile number, email. Quote requests: photos you upload, symptoms you describe, your GPS location, your radius, your health-fund details (if you provide them). Bookings: chosen dentist, slot, status. Audit: timestamps, IP, user agent on quote and booking actions.",
  },
  {
    h: "Why we collect it",
    p: "To route your request to nearby AHPRA-registered dentists, to deliver indicative quotes to you, to help you book a consult, and to keep an immutable audit trail in case of complaint or regulator review. We do not use your data for advertising and do not sell it.",
  },
  {
    h: "Location",
    p: "Location is used only when you submit a request. We do not track in the background. Location data linked to a request is deleted thirty days after the request closes.",
  },
  {
    h: "Photos",
    p: "Photos are stored in a private bucket. They are visible to you and to dentists matched to your request by AHPRA registration and geofence. Photos are deleted thirty days after the request closes unless you explicitly retain them.",
  },
  {
    h: "Sharing",
    p: "Photos and request details are shared only with AHPRA-registered dentists within your chosen radius. When you book, your name and contact details are released to the booked dentist. We do not share with insurers, marketers, or other patients.",
  },
  {
    h: "Your rights (APP, Privacy Act 1988)",
    p: "You may request access to or correction of your personal information. You may delete your account at any time, which deletes your future-readable data within thirty days. Some audit data must be retained for the period required by AHPRA / state health complaints regulators.",
  },
  {
    h: "Contact",
    p: "Privacy questions: privacy@quotemysmile.com.au. Complaints: see Terms of Service. You may also contact the OAIC if you are not satisfied with our response.",
  },
];

export default function PrivacyScreen() {
  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Privacy" />
      <ScrollView>
        <View className="px-8 pt-12 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-3">
            QuoteMySmile · Privacy Policy
          </Text>
          <Text className="font-display text-4xl text-espresso text-center leading-[1.05]">
            Your data, your call.
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
