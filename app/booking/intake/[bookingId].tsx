import { useEffect, useState } from "react";
import { View, Text, ScrollView, TextInput, Alert, Pressable } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import {
  saveBookingIntake,
  getBookingIntake,
  type PatientIntake,
} from "@/lib/services/bookingIntake";

/**
 * Post-booking patient intake — short safety form. The booking has
 * already happened, so we lead with copy that explains why we ask AND
 * make every field skippable ('none' / unsure). Dentists see this
 * before the chair via their booking screen.
 */
export default function BookingIntakeScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const [conditions, setConditions] = useState("");
  const [allergies, setAllergies] = useState("");
  const [meds, setMeds] = useState("");
  const [anxieties, setAnxieties] = useState("");
  const [lastClean, setLastClean] = useState("");
  const [smoker, setSmoker] = useState(false);
  const [pregnant, setPregnant] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    getBookingIntake(bookingId)
      .then(({ intake }) => {
        if (intake) {
          setConditions(intake.medical_conditions ?? "");
          setAllergies(intake.allergies ?? "");
          setMeds(intake.current_medications ?? "");
          setAnxieties(intake.anxieties ?? "");
          setLastClean(intake.last_cleaning_date ?? "");
          setSmoker(!!intake.smoker);
          setPregnant(!!intake.pregnant);
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [bookingId]);

  const handleSubmit = async () => {
    if (!bookingId) return;
    const payload: PatientIntake = {
      medical_conditions: conditions.trim(),
      allergies: allergies.trim(),
      current_medications: meds.trim(),
      anxieties: anxieties.trim(),
      last_cleaning_date: lastClean.trim(),
      smoker,
      pregnant,
    };
    setBusy(true);
    try {
      await saveBookingIntake(bookingId, payload);
      Alert.alert(
        "Sent to your dentist",
        "They'll review it before your appointment. You can update it any time from your booking.",
        [{ text: "OK", onPress: () => router.back() }],
      );
    } catch (e) {
      Alert.alert(
        "Couldn't save",
        e instanceof Error ? e.message : "Try again in a moment.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Pre-appointment intake" />
      <ScrollView>
        <View className="px-8 pt-12 pb-8 items-center">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
            For your dentist
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-6">
            A safer chair starts here.
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            Two minutes now spares your dentist surprises later — and
            saves you having to remember every detail at the chair. Type
            "none" for any field that doesn't apply.
          </Text>
        </View>

        <Field
          label="Medical conditions"
          hint="Heart, diabetes, immune, bleeding disorders, anything chronic."
          value={conditions}
          onChange={setConditions}
          multiline
        />
        <Field
          label="Allergies"
          hint="Latex, penicillin, local anaesthetic, metals — list known reactions."
          value={allergies}
          onChange={setAllergies}
          multiline
        />
        <Field
          label="Current medications"
          hint="Include blood thinners, bisphosphonates, contraceptives."
          value={meds}
          onChange={setMeds}
          multiline
        />
        <Field
          label="Chair anxieties"
          hint="Needle fear, gag reflex, claustrophobia. We brief the dentist."
          value={anxieties}
          onChange={setAnxieties}
          multiline
        />
        <Field
          label="Last professional clean"
          hint="e.g. March 2025, or 'never', or 'unsure'."
          value={lastClean}
          onChange={setLastClean}
        />

        <View className="px-8 mb-10">
          <Toggle
            label="I smoke or vape"
            value={smoker}
            onToggle={() => setSmoker((s) => !s)}
          />
          <Toggle
            label="I am pregnant or might be"
            value={pregnant}
            onToggle={() => setPregnant((p) => !p)}
          />
        </View>

        <View className="px-8 pb-24 items-center">
          {!loaded ? (
            <Text className="text-xs text-taupe font-sans mb-6">
              Loading any previous answers…
            </Text>
          ) : null}
          <Button variant="primary" size="lg" onPress={handleSubmit}>
            {busy ? "Saving…" : "Send to my dentist"}
          </Button>
          <Pressable onPress={() => router.back()} hitSlop={10} className="mt-6">
            <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">
              Do this later
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  multiline,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View className="px-8 mb-7">
      <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-2">
        {label}
      </Text>
      <Text className="text-xs text-walnut font-sans mb-3 leading-relaxed">
        {hint}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        multiline={!!multiline}
        placeholder="none"
        placeholderTextColor="#B5A99B"
        className="border border-linen bg-eggshell/30 px-4 py-3 font-sans text-base text-espresso"
        style={{
          minHeight: multiline ? 80 : 44,
          textAlignVertical: multiline ? "top" : "center",
        }}
      />
    </View>
  );
}

function Toggle({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) {
  return (
    <Pressable
      onPress={onToggle}
      className={`flex-row items-center justify-between border ${
        value ? "border-espresso bg-eggshell/40" : "border-linen"
      } px-4 py-4 mb-3`}
    >
      <Text className="font-sans text-base text-espresso flex-1 pr-4">
        {label}
      </Text>
      <View
        style={{
          width: 22,
          height: 22,
          borderWidth: 1.5,
          borderColor: value ? "#2A2520" : "#D8CDB9",
          backgroundColor: value ? "#2A2520" : "transparent",
        }}
      />
    </Pressable>
  );
}
