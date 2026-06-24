import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { useVideoPlayer, VideoView } from "expo-video";
import { BackBar } from "@/components/BackBar";
import { SketchIcon } from "@/components/SketchIcon";
import { useUserProfile } from "@/hooks/useUserProfile";
import {
  listMessages,
  sendMessage,
  sendAttachment,
  subscribeMessages,
  markMessagesRead,
  getAttachmentUrl,
  type Message,
} from "@/lib/services/messages";

/**
 * Booking-scoped chat between the patient and the clinic owner.
 *
 * After a quote is accepted, dentists frequently need additional context
 * to finalise the treatment plan. This screen lets both sides exchange
 * text, photos (camera roll or fresh capture) and short videos. The
 * underlying RLS is symmetric, so the same screen renders for both roles.
 *
 * Realtime via Supabase channels; falls back to a fetch on mount.
 */
export default function BookingMessagesScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useUserProfile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  /**
   * Launch the OS image/video picker. Photos > 1600px get a quick
   * resize+JPEG pass through expo-image-manipulator so we don't push
   * 4K originals through the chat bucket. Video uploads as-is — the
   * picker already enforces a duration cap (15 s) and the bucket has
   * a 30 MB file size limit.
   */
  const pickAttachment = async (mode: "camera" | "library") => {
    if (!id || uploading) return;
    if (mode === "camera") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Camera unavailable",
          "Enable camera access in Settings to send photos or videos.",
        );
        return;
      }
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Photos unavailable",
          "Enable photo library access in Settings to send photos or videos.",
        );
        return;
      }
    }

    const result =
      mode === "camera"
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            quality: 0.8,
            videoMaxDuration: 15,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            quality: 0.8,
            videoMaxDuration: 15,
          });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const isVideo = asset.type === "video";

    setUploading(true);
    try {
      let uri = asset.uri;
      let width = asset.width ?? null;
      let height = asset.height ?? null;
      let mime: string | undefined;

      // Compress large stills before upload. Skip for video; manipulator
      // would corrupt the H.264 stream.
      if (!isVideo) {
        const longest = Math.max(asset.width ?? 0, asset.height ?? 0);
        if (longest > 1600) {
          const out = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1600 } }],
            {
              compress: 0.78,
              format: ImageManipulator.SaveFormat.JPEG,
            },
          );
          uri = out.uri;
          width = out.width;
          height = out.height;
        }
        mime = "image/jpeg";
      }

      const inserted = await sendAttachment({
        bookingId: id,
        fileUri: uri,
        kind: isVideo ? "video" : "image",
        mime,
        width: width ?? undefined,
        height: height ?? undefined,
      });
      // Optimistic append — Realtime echo dedup is handled in the
      // subscribe callback via `some(m => m.id === msg.id)`.
      setMessages((prev) =>
        prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted],
      );
    } catch (e) {
      Alert.alert(
        "Upload failed",
        e instanceof Error ? e.message : "Please try again.",
      );
    } finally {
      setUploading(false);
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
                about parking, pre-meds, paperwork. You can also share extra
                photos or a short clip if the dentist asks for a closer look.
              </Text>
            </View>
          ) : (
            messages.map((m) => {
              const mine = user?.id === m.sender_id;
              return (
                <MessageBubble key={m.id} message={m} mine={mine} />
              );
            })
          )}
        </ScrollView>

        {/* Composer — text + camera + library. Buttons sit to the LEFT
            of the input so they don't push the send affordance off-screen
            on narrow phones. */}
        <View className="px-4 py-3 border-t border-linen flex-row items-end gap-2">
          <Pressable
            onPress={() => pickAttachment("camera")}
            disabled={uploading}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "rgba(31,79,71,0.18)",
              backgroundColor: "rgba(95,168,155,0.10)",
              alignItems: "center",
              justifyContent: "center",
              opacity: uploading ? 0.5 : 1,
            }}
            accessibilityLabel="Send from camera"
          >
            <SketchIcon name="camera" size={20} color="#2E7268" strokeWidth={1.6} noGhost />
          </Pressable>
          <Pressable
            onPress={() => pickAttachment("library")}
            disabled={uploading}
            hitSlop={8}
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              borderWidth: 1,
              borderColor: "rgba(31,79,71,0.18)",
              backgroundColor: "rgba(95,168,155,0.10)",
              alignItems: "center",
              justifyContent: "center",
              opacity: uploading ? 0.5 : 1,
            }}
            accessibilityLabel="Send from photo library"
          >
            <SketchIcon name="frame" size={20} color="#2E7268" strokeWidth={1.6} noGhost />
          </Pressable>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={uploading ? "Uploading…" : "Type a message…"}
            placeholderTextColor="#8A7E6F"
            multiline
            maxLength={2000}
            editable={!uploading}
            className="flex-1 bg-eggshell/40 border border-linen px-4 py-3 font-sans text-base text-espresso max-h-32"
            style={{ minHeight: 48, borderRadius: 12 }}
          />
          <Pressable
            onPress={handleSend}
            disabled={!draft.trim() || sending || uploading}
            style={{
              paddingHorizontal: 18,
              minHeight: 48,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor:
                draft.trim() && !sending && !uploading ? "#2A2520" : "#8A7E70",
            }}
          >
            <Text className="text-[11px] tracking-cap uppercase text-bone font-sans font-semibold">
              {sending ? "…" : "Send"}
            </Text>
          </Pressable>
        </View>
        {uploading ? (
          <View className="flex-row items-center justify-center gap-2 pb-2">
            <ActivityIndicator size="small" color="#2E7268" />
            <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
              Uploading…
            </Text>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Bubble — renders text + optional image / video. Signed URLs are fetched
 * lazily once per message so the list doesn't fire dozens of storage RPCs
 * on mount; instead each bubble resolves its own URL on first paint.
 */
function MessageBubble({ message, mine }: { message: Message; mine: boolean }) {
  const hasAttachment = !!message.attachment_url;
  const isVideo = message.attachment_kind === "video";
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!hasAttachment || !message.attachment_url) return;
    let cancelled = false;
    getAttachmentUrl(message.attachment_url).then((u) => {
      if (!cancelled) setSignedUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [hasAttachment, message.attachment_url]);

  // Preserve native aspect ratio when we have width/height metadata.
  const aspect =
    message.attachment_w && message.attachment_h
      ? message.attachment_w / message.attachment_h
      : 3 / 4;

  // Liquid-glass palette — MINE = gold-tinted (sender), THEIRS = mint-tinted
  // (clinic). Borrowed pattern from the LORDLY chat bubble: blurred surface +
  // translucent role tint + diagonal sheen + specular top rim + inset bottom
  // shadow. Adapted to QMS's light/cream theme.
  const tintFill = mine ? "rgba(201,169,97,0.22)" : "rgba(95,168,155,0.22)";
  const tintBorder = mine ? "rgba(201,169,97,0.55)" : "rgba(95,168,155,0.55)";
  const textColor = mine ? "#2A2520" : "#1F4F47";
  const radius = 18;
  const tailRadius = 6;

  return (
    <View className={`px-6 mb-3 ${mine ? "items-end" : "items-start"}`}>
      <View
        style={{
          maxWidth: "82%",
          borderRadius: radius,
          borderBottomRightRadius: mine ? tailRadius : radius,
          borderBottomLeftRadius: mine ? radius : tailRadius,
          overflow: "hidden",
          shadowColor: "#1F1B16",
          shadowOpacity: 0.18,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 8 },
          elevation: 6,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: tintBorder,
        }}
      >
        <BlurView
          intensity={Platform.OS === "android" ? 60 : 28}
          tint="light"
          style={{
            borderRadius: radius,
            borderBottomRightRadius: mine ? tailRadius : radius,
            borderBottomLeftRadius: mine ? radius : tailRadius,
            overflow: "hidden",
          }}
        >
          {/* Translucent role tint sits on top of the blur — this is what
              actually distinguishes mine vs theirs visually. */}
          <View style={[StyleSheet.absoluteFill, { backgroundColor: tintFill }]} />
          {/* Diagonal sheen — top-left bright, fades to bottom-right. */}
          <LinearGradient
            colors={["rgba(255,255,255,0.40)", "rgba(255,255,255,0)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          {/* 1pt specular rim along the top edge. */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "rgba(255,255,255,0.85)",
            }}
            pointerEvents="none"
          />
          {/* 1pt inset shadow along the bottom edge. */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "rgba(31,27,22,0.10)",
            }}
            pointerEvents="none"
          />

          {hasAttachment ? (
            <AttachmentView
              signedUrl={signedUrl}
              isVideo={isVideo}
              aspect={aspect}
            />
          ) : null}
          {message.body ? (
            <View style={{ paddingHorizontal: 14, paddingVertical: 10 }}>
              <Text
                style={{
                  fontFamily: "Inter",
                  fontSize: 14,
                  fontWeight: "600",
                  letterSpacing: -0.1,
                  lineHeight: 20,
                  color: textColor,
                  textShadowColor: "rgba(255,255,255,0.45)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 0,
                }}
              >
                {message.body}
              </Text>
            </View>
          ) : null}
        </BlurView>
      </View>
      <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-1">
        {new Date(message.created_at).toLocaleString("en-AU", {
          hour: "numeric",
          minute: "2-digit",
          day: "numeric",
          month: "short",
        })}
      </Text>
    </View>
  );
}

function AttachmentView({
  signedUrl,
  isVideo,
  aspect,
}: {
  signedUrl: string | null;
  isVideo: boolean;
  aspect: number;
}) {
  // Hooks must run unconditionally — pass an empty source until we have
  // a signed URL. expo-video tolerates this and shows nothing.
  const player = useVideoPlayer(isVideo && signedUrl ? signedUrl : "", (p) => {
    p.loop = false;
  });

  if (!signedUrl) {
    return (
      <View
        style={{
          width: 240,
          aspectRatio: aspect,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(31,79,71,0.06)",
        }}
      >
        <ActivityIndicator size="small" color="#2E7268" />
      </View>
    );
  }

  if (isVideo) {
    return (
      <VideoView
        player={player}
        style={{ width: 260, aspectRatio: aspect }}
        nativeControls
        contentFit="cover"
      />
    );
  }
  return (
    <Image
      source={{ uri: signedUrl }}
      style={{ width: 260, aspectRatio: aspect }}
      resizeMode="cover"
    />
  );
}
