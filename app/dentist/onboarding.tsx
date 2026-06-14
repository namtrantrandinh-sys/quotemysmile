import { useState } from "react";
import { View, Text, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { FieldLabel } from "@/components/FieldLabel";
import { TextField } from "@/components/TextField";
import { ProgressDots } from "@/components/ProgressDots";
import * as Location from "expo-location";
import { RadiusPreview } from "@/components/RadiusPreview";
import { Checkbox } from "@/components/Checkbox";
import { createUserProfile } from "@/lib/services/auth";
import {
  createClinic,
  ackDentistOnboarding,
  verifyCredentials,
} from "@/lib/services/dentist";
import { supabase } from "@/lib/supabase";
import type { CategoryId } from "@/lib/types";

/**
 * Geocode the clinic address. Falls back to a Melbourne CBD pin if geocoding
 * fails — the dentist can correct it later in settings.
 */
async function geocodeAddress(addr: string): Promise<{ lat: number; lng: number }> {
  try {
    const r = await Location.geocodeAsync(addr);
    if (r[0]) return { lat: r[0].latitude, lng: r[0].longitude };
  } catch {}
  return { lat: -37.831, lng: 145.058 };
}

type Step =
  | "welcome"
  | "practitioner"
  | "clinic"
  | "insurance"
  | "services"
  | "agreements"
  | "review";

const ORDER: Step[] = [
  "welcome",
  "practitioner",
  "clinic",
  "insurance",
  "services",
  "agreements",
  "review",
];

export default function DentistOnboarding() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("welcome");

  // form state
  const [ahpra, setAhpra] = useState("");
  const [name, setName] = useState("");
  const [clinic, setClinic] = useState("");
  const [abn, setAbn] = useState("");
  const [address, setAddress] = useState("");
  const [piiProvider, setPiiProvider] = useState("");
  const [piiPolicy, setPiiPolicy] = useState("");
  const [piiExpiry, setPiiExpiry] = useState("");
  const [acks, setAcks] = useState<Set<string>>(new Set());
  const [radius, setRadius] = useState(10);

  function toggleAck(key: string) {
    const next = new Set(acks);
    next.has(key) ? next.delete(key) : next.add(key);
    setAcks(next);
  }

  const idx = ORDER.indexOf(step);
  const next = () => setStep(ORDER[Math.min(idx + 1, ORDER.length - 1)]);

  const ALL_ACKS = [
    {
      key: "responsibility",
      text: "I am the responsible registered dental practitioner for all quotes I submit and accept full professional and legal responsibility for them.",
    },
    {
      key: "ahpra-ads",
      text: "I will not make claims that breach AHPRA advertising guidelines — no testimonials, guarantees, or outcome promises.",
    },
    {
      key: "pii",
      text: "I hold current Professional Indemnity Insurance covering my use of this platform.",
    },
    {
      key: "photo-based",
      text: "I understand quotes are indicative, based on patient photos only, until clinical examination.",
    },
    {
      key: "tos",
      text: "I have read and agree to the Dentist Terms of Service and AHPRA Compliance Addendum.",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar
        title={`Step ${String(idx + 1).padStart(2, "0")} of ${String(ORDER.length).padStart(2, "0")}`}
        right={<ProgressDots step={idx + 1} total={ORDER.length} />}
      />

      <ScrollView>
        <View className="px-8 pt-12 pb-24">
          {step === "welcome" && (
            <View className="items-center">
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Welcome
              </Text>
              <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-8">
                Quote on your terms.
              </Text>
              <Text className="text-base text-walnut font-sans text-center max-w-md leading-relaxed mb-8">
                Set your availability, pick the work you want, and respond to
                live requests within your service area. Free for the first
                ninety days. Cancel any time.
              </Text>

              <View className="border border-linen bg-eggshell/40 p-5 w-full max-w-md mb-8">
                <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-3">
                  What to know upfront
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed mb-2">
                  · You get <Text className="font-display text-gold italic">one requote</Text> per
                  request — strategic, not a death-spiral.
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed mb-2">
                  · You're the responsible AHPRA-registered practitioner for every quote.
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed mb-2">
                  · Quotes are indicative — final fees at the chair-side exam.
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed">
                  · Emergency requests pay 30–50% premium. Patients are warned.
                </Text>
              </View>

              <Button variant="primary" size="lg" onPress={next}>
                Start signup
              </Button>
              <View className="mt-4">
                <Button variant="ghost" size="md" onPress={() => router.push("/dentist/guide")}>
                  Read the full guide first
                </Button>
              </View>
            </View>
          )}

          {step === "practitioner" && (
            <View>
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Practitioner
              </Text>
              <Text className="font-display text-4xl text-espresso mb-10 leading-[1.05]">
                About you.
              </Text>

              <FieldLabel
                label="AHPRA registration number"
                hint="We verify your registration against the public AHPRA register. Suspended or conditional registrations cannot proceed."
              >
                <TextField value={ahpra} onChangeText={setAhpra} placeholder="DEN0001234567" />
              </FieldLabel>

              <FieldLabel label="Full name (as registered)">
                <TextField value={name} onChangeText={setName} placeholder="Dr Sarah Chen" />
              </FieldLabel>

              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={next}>
                  Continue
                </Button>
              </View>
            </View>
          )}

          {step === "clinic" && (
            <View>
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Clinic
              </Text>
              <Text className="font-display text-4xl text-espresso mb-10 leading-[1.05]">
                Your practice.
              </Text>

              <FieldLabel label="Clinic name">
                <TextField value={clinic} onChangeText={setClinic} placeholder="Camberwell Dental" />
              </FieldLabel>

              <FieldLabel label="ABN" hint="We verify against the public ABN Lookup register.">
                <TextField value={abn} onChangeText={setAbn} placeholder="12 345 678 901" keyboardType="numeric" />
              </FieldLabel>

              <FieldLabel
                label="Clinic address"
                hint="This becomes your GPS service origin. You must be within 500m of this address to receive live requests."
              >
                <TextField value={address} onChangeText={setAddress} placeholder="123 Burke Rd, Camberwell VIC 3124" />
              </FieldLabel>

              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={next}>
                  Continue
                </Button>
              </View>
            </View>
          )}

          {step === "insurance" && (
            <View>
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Professional indemnity
              </Text>
              <Text className="font-display text-4xl text-espresso mb-6 leading-[1.05]">
                Insurance proof.
              </Text>
              <Text className="text-sm text-walnut font-sans leading-relaxed mb-10">
                Mandatory under the National Law. We hold details on file and
                verify annually.
              </Text>

              <FieldLabel label="Provider">
                <TextField value={piiProvider} onChangeText={setPiiProvider} placeholder="MIPS / Guild / Avant" />
              </FieldLabel>

              <FieldLabel label="Policy number">
                <TextField value={piiPolicy} onChangeText={setPiiPolicy} placeholder="123-456-789" />
              </FieldLabel>

              <FieldLabel label="Expiry date" hint="DD / MM / YYYY">
                <TextField value={piiExpiry} onChangeText={setPiiExpiry} placeholder="30 / 06 / 2027" />
              </FieldLabel>

              <View className="border border-linen bg-eggshell/40 p-5 mb-10">
                <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-2">
                  Upload policy certificate
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed mb-3">
                  PDF or image. We never share with patients.
                </Text>
                <Text className="text-[11px] tracking-cap uppercase text-gold font-sans">
                  + Choose file
                </Text>
              </View>

              <View className="items-center">
                <Button variant="primary" size="lg" onPress={next}>
                  Continue
                </Button>
              </View>
            </View>
          )}

          {step === "services" && (
            <View>
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Services
              </Text>
              <Text className="font-display text-4xl text-espresso mb-10 leading-[1.05]">
                Where and what.
              </Text>

              <FieldLabel label="Service radius" hint="Live requests within this radius will be offered to you.">
                <RadiusPreview radiusKm={radius} suburb={(address || "your clinic").split(",")[0]} />
                <View className="flex-row gap-2 mt-4">
                  {[5, 10, 15, 20, 30].map((r) => (
                    <View
                      key={r}
                      onTouchEnd={() => setRadius(r)}
                      className={`flex-1 items-center py-3 border ${
                        radius === r ? "border-espresso bg-espresso" : "border-linen"
                      }`}
                    >
                      <Text className={`text-[11px] tracking-cap uppercase font-sans ${
                        radius === r ? "text-bone" : "text-walnut"
                      }`}>
                        {r}
                      </Text>
                    </View>
                  ))}
                </View>
              </FieldLabel>

              <FieldLabel label="Categories you offer">
                <Text className="text-sm text-walnut font-sans leading-relaxed">
                  Filling + clean · Check-up + clean · Crown · Cosmetic · Whitening · Emergency
                </Text>
              </FieldLabel>

              <FieldLabel label="Clinic exterior photo" hint="Trust signal for patients. Real, not stock.">
                <View className="border border-linen bg-eggshell/40 p-8 items-center">
                  <Text className="text-[11px] tracking-cap uppercase text-gold font-sans">
                    + Upload photo
                  </Text>
                </View>
              </FieldLabel>

              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={next}>
                  Continue
                </Button>
              </View>
            </View>
          )}

          {step === "agreements" && (
            <View>
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Final agreements
              </Text>
              <Text className="font-display text-4xl text-espresso mb-6 leading-[1.05]">
                Please confirm.
              </Text>
              <Text className="text-sm text-walnut font-sans leading-relaxed mb-10">
                Each acknowledgement is timestamped and stored as part of your
                onboarding record.
              </Text>

              <View className="gap-2 mb-12">
                {ALL_ACKS.map((a) => (
                  <Checkbox
                    key={a.key}
                    checked={acks.has(a.key)}
                    onToggle={() => toggleAck(a.key)}
                    label={a.text}
                  />
                ))}
              </View>

              <View className="items-center">
                <Button
                  variant="primary"
                  size="lg"
                  onPress={async () => {
                    if (acks.size !== ALL_ACKS.length) return;
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        Alert.alert("Sign in first", "Use sign-in to verify your number, then come back.");
                        router.push("/sign-in");
                        return;
                      }
                      await createUserProfile({
                        role: "dentist",
                        fullName: name || "Dentist",
                        ahpraNo: ahpra,
                      });
                      const defaultCats: CategoryId[] = [
                        "filling-clean",
                        "checkup-clean",
                        "whitening",
                        "cosmetic",
                        "crown-veneer",
                        "emergency",
                      ];
                      const coords = await geocodeAddress(address);
                      const newClinic = await createClinic({
                        name: clinic || "My Clinic",
                        abn: abn || "",
                        address: address || "",
                        coords,
                        serviceRadiusKm: radius,
                        categories: defaultCats,
                        piiProvider,
                        piiPolicy,
                        piiExpiry,
                      });
                      const nowIso = new Date().toISOString();
                      await ackDentistOnboarding(
                        Array.from(acks).map((key) => ({ key, accepted_at: nowIso })),
                      );
                      // Kick off AHPRA + ABN verification — non-blocking.
                      // Dashboard banner will reflect the result.
                      void verifyCredentials({
                        ahpraNo: ahpra,
                        expectedName: name,
                        abn,
                        clinicId: newClinic.id,
                      }).catch(() => {});
                      next();
                    } catch (e) {
                      Alert.alert("Signup error", e instanceof Error ? e.message : "Try again.");
                    }
                  }}
                >
                  {acks.size === ALL_ACKS.length ? "Continue" : `Tick all ${ALL_ACKS.length}`}
                </Button>
              </View>
            </View>
          )}

          {step === "review" && (
            <View className="items-center">
              <View className="h-2 w-2 rounded-full bg-gold mb-12" />
              <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
                Pending review
              </Text>
              <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-8">
                You're in.
              </Text>
              <Text className="text-base text-walnut font-sans text-center max-w-md leading-relaxed mb-12">
                We verify your AHPRA registration, ABN and PII within 24 hours.
                You'll be active and able to quote as soon as we confirm.
              </Text>
              <Button variant="primary" size="lg" onPress={() => router.replace("/dentist")}>
                Open dashboard
              </Button>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
