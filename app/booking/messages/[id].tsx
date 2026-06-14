import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackBar } from "@/components/BackBar";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  listMessages,
  sendMessage,
  subscribeMessages,
  markMessagesRead,
  type Message,
} from "@/lib/services/messages";

/**
 * Booking-scoped chat between the patient and the clinic owner.
 * Realtime via Supabase channels; falls back to a fetch on mount.
 */
export default function BookingMessagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useUserProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    if (!id) return;
    let isMounted = true;

    listMessages(id)
      .then((rows) => {
        if (!isMounted) return;
        setMessages(rows);
      })
      .catch(() => {});

    void markMessagesRead(id);

    const ch = subscribeMessages(id, (msg) => {
      if (!isMounted) return;
      setMessages((prev) =>
        prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
      );
    });

    return () => {
      isMounted = false;
      (ch as { unsubscribe?: () => void })?.unsubscribe?.();
    };
  }, [id]);

  useEffect(() => {
    requestAnimationFrame(() =>
      scrollRef.current?.scrollToEnd({ animated: true }),
    );
  }, [messages.length]);

  const handleSend = async () => {
    if (!id || !draft.trim() || sending) return;
    setSending(true);
    try {
      await sendMessage(id, draft);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar title="Messages" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ paddingVertical: 24 }}
        >
          {messages.length === 0 ? (
            <View className="px-8 py-12 items-center">
              <Text className="text-[10px] tracking-editorial uppercase text-taupe font-sans mb-4">
                Booking-scoped
              </Text>
              <Text className="font-display text-3xl text-espresso text-center mb-3">
                No messages yet.
              </Text>
              <Text className="text-sm text-walnut font-sans text-center max-w-sm leading-relaxed">
                Use this to confirm anything before your visit — questions
                about parking, pre-meds, paperwork. Replies come straight from
                the clinic.
              </Text>
            </View>
          ) : (
            messages.map((m) => {
              const mine = profile?.id === m.sender_id;
              return (
                <View
                  key={m.id}
                  className={`px-8 mb-3 ${mine ? "items-end" : "items-start"}`}
                >
                  <View
                    className={`max-w-[78%] px-4 py-3 ${
                      mine
                        ? "bg-gold/10 border border-gold/30"
                        : "bg-eggshell border border-linen"
                    }`}
                  >
                    <Text className="font-sans text-base text-espresso leading-relaxed">
                      {m.body}
                    </Text>
                  </View>
                  <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-1">
                    {new Date(m.created_at).toLocaleString("en-AU", {
                      hour: "numeric",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    })}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>

        <View className="px-6 py-4 border-t border-linen flex-row items-end gap-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor="#8A7E6F"
            multiline
            maxLength={2000}
            className="flex-1 bg-eggshell/40 border border-linen px-4 py-3 font-sans text-base text-espresso max-h-32"
            style={{ minHeight: 48 }}
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || sending}
            className={`px-5 py-3 ${
              draft.trim() && !sending ? "bg-espresso" : "bg-taupe"
            }`}
          >
            <Text className="text-[11px] tracking-cap uppercase text-bone font-sans">
              {sending ? "…" : "Send"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
