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
import { createDentistProfile } from "@/lib/services/auth";
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

  // --- Per-step validation. Returns null when the step is complete, or a
  // user-facing message explaining what's missing. The Continue button
  // shows this message in an Alert so the dentist knows exactly what to do.
  const AHPRA_RE = /^DEN\d{10}$/;
  const ABN_RE = /^\d{11}$/;
  const cleanAbn = abn.replace(/\s/g, "");

  function validateStep(s: Step): string | null {
    switch (s) {
      case "practitioner":
        if (!AHPRA_RE.test(ahpra.trim().toUpperCase()))
          return "AHPRA registration must be DEN followed by 10 digits (e.g. DEN0001234567).";
        if (!name.trim() || name.trim().length < 3)
          return "Enter your full registered name.";
        return null;
      case "clinic":
        if (!clinic.trim()) return "Clinic name is required.";
        if (!ABN_RE.test(cleanAbn)) return "ABN must be exactly 11 digits.";
        if (!address.trim() || address.trim().length < 8)
          return "Enter your full clinic address.";
        return null;
      case "insurance":
        if (!piiProvider.trim()) return "Pick or enter your PII provider.";
        if (!piiPolicy.trim()) return "Policy number is required.";
        if (!/^\d{2}\s?\/\s?\d{2}\s?\/\s?\d{4}$/.test(piiExpiry.trim()))
          return "Expiry must be in DD / MM / YYYY format.";
        return null;
      case "services":
        if (![5, 10, 15, 20, 30].includes(radius))
          return "Choose a service radius.";
        return null;
      case "agreements":
        if (acks.size !== ALL_ACKS.length)
          return `Tick all ${ALL_ACKS.length} acknowledgements to continue.`;
        return null;
      default:
        return null;
    }
  }

  function tryNext() {
    const msg = validateStep(step);
    if (msg) {
      Alert.alert("Almost there", msg);
      return;
    }
    next();
  }

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
                live requests within your service area. Free for dentists,
                always — no subscription.
              </Text>

              <View className="border border-linen bg-eggshell/40 p-5 w-full max-w-md mb-6">
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

              <View className="border border-linen bg-bone p-5 w-full max-w-md mb-8">
                <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-3">
                  Verification — what to expect
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed mb-1.5">
                  <Text className="text-espresso">AHPRA</Text> — verified live against the public register the moment you submit (instant).
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed mb-1.5">
                  <Text className="text-espresso">ABN</Text> — checked against ABN Lookup (instant).
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed">
                  <Text className="text-espresso">PII certificate + clinic photo</Text> — we'll email a secure upload link. You have 14 days. Quoting stays paused until both are on file.
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
                hint="Format: DEN + 10 digits (e.g. DEN0001234567). We check the public AHPRA register live. Suspended or conditional registrations cannot proceed."
              >
                <TextField
                  value={ahpra}
                  onChangeText={(v) => setAhpra(v.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                  placeholder="DEN0001234567"
                  maxLength={13}
                />
              </FieldLabel>

              <FieldLabel
                label="Full name (as registered)"
                hint="Must match exactly what AHPRA has on file — including 'Dr', middle names, hyphens."
              >
                <TextField value={name} onChangeText={setName} placeholder="Dr Sarah Chen" />
              </FieldLabel>

              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={tryNext}>
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

              <FieldLabel
                label="ABN"
                hint="11 digits. We verify against the public ABN Lookup register. Spaces are fine — we strip them."
              >
                <TextField
                  value={abn}
                  onChangeText={setAbn}
                  placeholder="12 345 678 901"
                  keyboardType="numeric"
                  maxLength={14}
                />
              </FieldLabel>

              <FieldLabel
                label="Clinic address"
                hint="This becomes your GPS service origin. You must be within 500m of this address to receive live requests."
              >
                <TextField value={address} onChangeText={setAddress} placeholder="123 Burke Rd, Camberwell VIC 3124" />
              </FieldLabel>

              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={tryNext}>
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
                  Policy certificate
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed">
                  After signup we'll email <Text className="text-espresso">support@quotemysmile.com.au</Text>{" "}
                  with a secure upload link. You have 14 days. Quoting stays
                  paused until the certificate is on file.
                </Text>
              </View>

              <View className="items-center">
                <Button variant="primary" size="lg" onPress={tryNext}>
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

              <View className="border border-linen bg-eggshell/40 p-5 mt-6 mb-6">
                <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-2">
                  Clinic exterior photo
                </Text>
                <Text className="text-sm text-walnut font-sans leading-relaxed">
                  Trust signal for patients (real, not stock). We'll request this
                  by email after signup — same secure upload link as your PII.
                </Text>
              </View>

              <View className="items-center mt-6">
                <Button variant="primary" size="lg" onPress={tryNext}>
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
                      await createDentistProfile({
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
                We've kicked off your AHPRA + ABN checks — these usually
                complete within a minute and show as green on your dashboard.
                A secure email link for your PII certificate is on its way
                to the address on your AHPRA record.
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
