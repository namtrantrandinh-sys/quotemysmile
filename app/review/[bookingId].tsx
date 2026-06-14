import { useEffect, useState } from "react";
import { View, Text, ScrollView, Pressable, Alert } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { FieldLabel } from "@/components/FieldLabel";
import { TextField } from "@/components/TextField";
import { Icon } from "@/components/Icon";
import { getBooking } from "@/lib/services/bookings";
import { submitReview } from "@/lib/services/reviews";

export default function ReviewScreen() {
  const router = useRouter();
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [b, setB] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!bookingId) return;
    getBooking(bookingId).then(setB).catch(() => {});
  }, [bookingId]);

  const submit = async () => {
    if (!b?.clinic_id) return;
    setBusy(true);
    try {
      await submitReview({
        bookingId: b.id,
        clinicId: b.clinic_id,
        rating,
        body: body.trim() || undefined,
      });
      Alert.alert("Thank you", "Your review has been published.");
      router.replace("/inbox");
    } catch (e) {
      Alert.alert("Could not submit", e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Leave a review" />
      <ScrollView>
        <View className="px-8 pt-10 pb-6 items-center">
          <Icon name="spark" size={42} />
          <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mt-5 mb-3">
            Verified visit
          </Text>
          <Text className="font-display text-4xl text-espresso text-center leading-[1.05] mb-3">
            How was the visit?
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed">
            Only patients who attended can review. Helps other patients choose.
          </Text>
        </View>

        <View className="px-8 mb-10 items-center">
          <View className="flex-row gap-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable key={n} onPress={() => setRating(n)} hitSlop={10}>
                <Text
                  style={{
                    fontFamily: "Cinzel-Medium",
                    fontSize: 36,
                    color: n <= rating ? "#A9CFC0" : "#E5DCC8",
                  }}
                >
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
          <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans mt-4">
            {rating} of 5
          </Text>
        </View>

        <View className="px-8 mb-12">
          <FieldLabel
            label="Your thoughts"
            hint="Optional. AHPRA rules — focus on the experience, not clinical outcomes."
          >
            <TextField
              value={body}
              onChangeText={setBody}
              placeholder="Friendly clinic, on time, transparent about costs."
              multiline
              maxLength={400}
            />
          </FieldLabel>
        </View>

        <View className="px-8 pb-24 items-center">
          <Button variant="primary" size="lg" onPress={submit}>
            {busy ? "Publishing…" : "Publish review"}
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
