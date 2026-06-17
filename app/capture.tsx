import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  Linking,
  Platform,
  TextInput,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  CameraView,
  type CameraType,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { BackBar } from "@/components/BackBar";
import { Button, TileButton } from "@/components/Button";
import { ProgressDots } from "@/components/ProgressDots";
import { CameraOverlay } from "@/components/CameraOverlay";
import { ArchIcon } from "@/components/ArchIcon";
import { MouthMap } from "@/components/MouthMap";
import { PhotoInfoCard, PhotoTips } from "@/components/PhotoInfoCard";
import { Icon } from "@/components/Icon";
import { getCategory } from "@/lib/categories";
import { usePhotoCapture } from "@/hooks/usePhotoCapture";
import { setIntake } from "@/lib/intakeStore";

export default function CaptureScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ c?: string }>();
  const category = getCategory(params.c ?? "");
  const photos = usePhotoCapture();
  const [permission, requestPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [snapping, setSnapping] = useState(false);
  const [mode, setMode] = useState<"photo" | "video">("photo");
  // Default to FRONT camera — patients are photographing their own mouth,
  // so the selfie sensor is the natural starting position (no awkward arm
  // flip to see the screen). Flip button is always available.
  const [facing, setFacing] = useState<CameraType>("front");
  const cameraRef = useRef<CameraView | null>(null);
  // Tracks whether the user pressed Cancel during a pending snap so we can
  // suppress the auto-advance that would otherwise reopen the camera.
  const cancelledRef = useRef(false);

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:").catch(() => {});
    } else {
      Linking.openSettings().catch(() => {});
    }
  };

  const openCamera = async (slotId: number) => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) {
        // iOS only re-prompts once; after that it's "denied" forever
        // until the user toggles it in Settings. Surface the path.
        Alert.alert(
          "Camera access needed",
          "QuoteMySmile uses your camera for the four guided photos. Enable it in Settings to continue.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: openSettings },
          ],
        );
        return;
      }
    }
    cancelledRef.current = false;
    setFacing("front"); // every fresh open starts with the selfie camera
    setActiveSlot(slotId);
  };

  const cancelCapture = () => {
    cancelledRef.current = true;
    setSnapping(false);
    setActiveSlot(null);
  };

  const snap = async () => {
    if (!cameraRef.current || activeSlot == null || snapping) return;
    setSnapping(true);
    try {
      // 8 s timeout so a wedged camera (rare but real on older devices)
      // can't lock the snap button in a spinning state forever.
      const result = await Promise.race<{ uri: string } | undefined>([
        cameraRef.current.takePictureAsync({ quality: 0.9 }),
        new Promise<undefined>((_, reject) =>
          setTimeout(
            () => reject(new Error("Camera timed out — try again.")),
            8_000,
          ),
        ),
      ]);
      // If the user pressed Cancel mid-snap, drop the captured image and
      // bail out — do NOT auto-advance to the next slot.
      if (cancelledRef.current) return;
      if (result?.uri) await photos.capture(activeSlot, result.uri);
      const completedSlot = activeSlot;
      setActiveSlot(null);
      // Auto-advance: open next un-captured slot (unless user has cancelled)
      const next = photos.slots.find((s) => !s.uri && s.id !== completedSlot);
      if (next && !cancelledRef.current) {
        setTimeout(() => {
          if (!cancelledRef.current) openCamera(next.id);
        }, 600);
      }
    } catch (e) {
      if (!cancelledRef.current) {
        Alert.alert(
          "Couldn't capture",
          e instanceof Error ? e.message : "Try once more.",
        );
      }
    } finally {
      setSnapping(false);
    }
  };

  // Video recording uses the OS's native camera UI via expo-image-picker.
  // expo-camera v56's in-app recordAsync has a known iOS-side hang when
  // mixed with picture mode + new arch disabled. The OS recorder is rock
  // solid: tap Record, tap Stop, returns a clean .mov.
  const recordVideo = async () => {
    if (activeSlot == null) return;
    const slotId = activeSlot;
    // Video needs microphone too.
    if (!micPermission?.granted) {
      const r = await requestMicPermission();
      if (!r.granted) {
        Alert.alert(
          "Microphone access needed",
          "Video uses the microphone. Enable it in Settings to record.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: openSettings },
          ],
        );
        return;
      }
    }
    // Close our in-app camera modal so the OS recorder can take over the
    // screen cleanly. Otherwise iOS surfaces a "Camera already in use"
    // hardware lock and the OS recorder shows a black preview.
    setActiveSlot(null);
    // Defer one tick so the modal teardown finishes before the picker mounts.
    setTimeout(async () => {
      try {
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["videos"],
          videoMaxDuration: 15,
          quality: 0.85,
          cameraType:
            facing === "front"
              ? ImagePicker.CameraType.front
              : ImagePicker.CameraType.back,
        });
        if (result.canceled || !result.assets?.[0]?.uri) return;
        await photos.capture(slotId, result.assets[0].uri, "video");
        // Auto-advance to the next un-captured slot, like the photo flow.
        const nextSlot = photos.slots.find((s) => !s.uri && s.id !== slotId);
        if (nextSlot) setTimeout(() => openCamera(nextSlot.id), 400);
      } catch (e) {
        Alert.alert(
          "Couldn't record",
          e instanceof Error ? e.message : "Try once more.",
        );
      }
    }, 150);
  };

  const handleRetake = (slotId: number) => {
    Alert.alert(
      "Retake this photo?",
      "Your current photo will be replaced.",
      [
        { text: "Keep current", style: "cancel" },
        {
          text: "Retake",
          style: "destructive",
          onPress: () => {
            photos.retake(slotId);
            openCamera(slotId);
          },
        },
      ],
    );
  };

  const activeSlotObj = activeSlot != null ? photos.slots[activeSlot - 1] : null;
  const flipCamera = () => setFacing((f) => (f === "back" ? "front" : "back"));

  return (
    <SafeAreaView className="flex-1 bg-bone">
      <BackBar
        title="Step 02 · Mouth scan"
        right={<ProgressDots step={2} total={6} />}
      />
      <ScrollView>
        <View className="px-8 pt-12 pb-6 items-center">
          <View className="mb-6">
            <Icon name="mouth" size={56} />
          </View>
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-4">
            {category?.label ?? "Photo capture"}
          </Text>
          <Text className="font-display text-5xl text-espresso text-center leading-[1.05] mb-3">
            Map your mouth.
          </Text>
          <Text className="text-sm text-walnut font-sans text-center max-w-md leading-relaxed mb-10">
            Four guided photos. We'll show you the angle, you tap to capture.
          </Text>

          {/* Live mouth map */}
          <View className="mb-6">
            <MouthMap slots={photos.slots} activeSlotName={photos.nextSlot?.name} />
          </View>
        </View>

        <View className="px-8 mb-2">
          <PhotoInfoCard
            icon="camera"
            mcIcon="camera-iris"
            title="Clearer photo = more accurate quote"
            hint="On-camera guides show you exactly where to frame. Tap a slot to start."
            tone="gold"
          />
        </View>

        <PhotoTips
          tips={[
            { icon: "spark", mcIcon: "white-balance-sunny", label: "Daylight" },
            { icon: "scan", mcIcon: "hand-back-right-outline", label: "Hold still" },
            { icon: "check", mcIcon: "crop-free", label: "Centre frame" },
          ]}
        />

        <View className="px-6 pb-12" style={{ gap: 12 }}>
          {photos.slots.map((s) => {
            const SLOT_ICON: Record<typeof s.name, keyof typeof MaterialCommunityIcons.glyphMap | null> = {
              "front-smile": "emoticon-happy-outline",
              "upper-arch": null,
              "lower-arch": null,
              "problem-area": "magnify-scan",
            };
            const iconName = SLOT_ICON[s.name];
            const isNext = !s.uri && s.id === photos.nextSlot?.id;
            const captured = !!s.uri;

            const leadingIcon = (
              <View
                style={{
                  width: 46,
                  height: 46,
                  borderRadius: 23,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: captured
                    ? "rgba(95,168,155,0.20)"
                    : "rgba(95,168,155,0.12)",
                }}
              >
                {s.name === "upper-arch" ? (
                  <ArchIcon variant="upper" size={26} color="#5FA89B" />
                ) : s.name === "lower-arch" ? (
                  <ArchIcon variant="lower" size={26} color="#5FA89B" />
                ) : iconName ? (
                  <MaterialCommunityIcons name={iconName} size={24} color="#5FA89B" />
                ) : null}
              </View>
            );

            // Traffic-light quality chip — green ≥4, amber 3-4, red <3.
            // Promotes the score from a buried subtitle to glanceable feedback.
            const score = s.qualityScore ?? 0;
            const qualityTier =
              score >= 4 ? "good" : score >= 3 ? "ok" : "low";
            const qualityColor =
              qualityTier === "good"
                ? "#4A6B4F"
                : qualityTier === "ok"
                  ? "#A8843D"
                  : "#9E5E47";
            const qualityBg =
              qualityTier === "good"
                ? "rgba(74,107,79,0.10)"
                : qualityTier === "ok"
                  ? "rgba(168,132,61,0.10)"
                  : "rgba(158,94,71,0.10)";

            const trailing = captured ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                {s.qualityScore != null ? (
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 999,
                      backgroundColor: qualityBg,
                      borderWidth: 1,
                      borderColor: qualityColor + "55",
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter-Medium",
                        fontSize: 10,
                        letterSpacing: 0.6,
                        color: qualityColor,
                      }}
                    >
                      {score.toFixed(1)}
                    </Text>
                  </View>
                ) : null}
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#5FA89B",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                </View>
              </View>
            ) : (
              <Button
                variant={isNext ? "primary" : "tonal"}
                size="sm"
                leftIcon="plus"
                onPress={() => openCamera(s.id)}
              >
                Add
              </Button>
            );

            return (
              <View key={s.id} style={{ gap: 8 }}>
                <TileButton
                  emphasis={isNext}
                  kicker={`Photo ${s.id} of ${photos.totalSlots}`}
                  title={s.label}
                  subtitle={s.hint}
                  leftSlot={leadingIcon}
                  trailing={trailing}
                  onPress={() => (s.uri ? handleRetake(s.id) : openCamera(s.id))}
                />
                {/* Caption field on captured photos — the brief-not-intake reframe.
                    e.g. "I'd like this gap closed" written under the front shot. */}
                {captured ? (
                  <View
                    style={{
                      marginHorizontal: 4,
                      marginTop: -2,
                      paddingHorizontal: 14,
                      paddingTop: 10,
                      paddingBottom: 10,
                      borderLeftWidth: 2,
                      borderLeftColor: "#5FA89B",
                      backgroundColor: "rgba(95,168,155,0.05)",
                      borderTopRightRadius: 4,
                      borderBottomRightRadius: 4,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: "Inter-Medium",
                        fontSize: 9,
                        letterSpacing: 1.4,
                        textTransform: "uppercase",
                        color: "#3F7E73",
                        marginBottom: 4,
                      }}
                    >
                      Tell the dentist · optional
                    </Text>
                    <TextInput
                      value={s.caption ?? ""}
                      onChangeText={(t) => photos.setCaption(s.id, t)}
                      placeholder="e.g. I'd like this gap closed"
                      placeholderTextColor="#9C9285"
                      multiline
                      maxLength={220}
                      style={{
                        fontFamily: "Lora-Italic",
                        fontStyle: "italic",
                        fontSize: 14,
                        lineHeight: 20,
                        color: "#4D423A",
                        padding: 0,
                        minHeight: 22,
                      }}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <Modal
          visible={activeSlot !== null}
          animationType="slide"
          onRequestClose={() => cancelCapture()}
        >
          <View className="flex-1 bg-onyx">
            {/* Always mount CameraView in picture mode — video uses the
                OS's native recorder which appears in its own screen. */}
            <CameraView
              key={`picture-${facing}`}
              ref={cameraRef}
              style={{ flex: 1 }}
              facing={facing}
              mode="picture"
            />
            {activeSlot !== null && activeSlotObj ? (
              <CameraOverlay
                slotName={activeSlotObj.label}
                slotIndex={activeSlot}
                total={photos.totalSlots}
                guideShape={activeSlotObj.guideShape}
              />
            ) : null}

            {/* Top bar — uses SafeAreaView so Cancel + status sit BELOW
                the Dynamic Island / notch on iPhone. */}
            <SafeAreaView
              edges={["top"]}
              pointerEvents="box-none"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
              }}
            >
              <View
                style={{
                  paddingHorizontal: 20,
                  paddingTop: 12,
                  paddingBottom: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Pressable
                  onPress={cancelCapture}
                  hitSlop={12}
                  style={{
                    backgroundColor: "rgba(0,0,0,0.45)",
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 999,
                  }}
                >
                  <Text className="text-[12px] tracking-cap uppercase text-bone font-sans">
                    Cancel
                  </Text>
                </Pressable>
                <Text
                  className="text-[11px] tracking-cap uppercase text-bone font-sans"
                  style={{
                    backgroundColor: "rgba(0,0,0,0.45)",
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                  }}
                >
                  Natural light
                </Text>
                {/* Flip camera button — top right of the top row. */}
                <Pressable
                  onPress={flipCamera}
                  hitSlop={12}
                  style={{
                    backgroundColor: "rgba(0,0,0,0.45)",
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MaterialCommunityIcons
                    name="camera-flip-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                </Pressable>
              </View>
            </SafeAreaView>

            {/* Photo / Video mode toggle */}
            <View className="absolute bottom-44 left-0 right-0 flex-row justify-center">
                <View className="flex-row bg-onyx/60 border border-bone/20 rounded-full px-1 py-1">
                  <Pressable
                    onPress={() => setMode("photo")}
                    className={`px-5 py-2 rounded-full ${mode === "photo" ? "bg-bone" : ""}`}
                  >
                    <Text
                      className={`text-[11px] tracking-cap uppercase font-sans ${mode === "photo" ? "text-espresso" : "text-bone"}`}
                    >
                      Photo
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setMode("video")}
                    className={`px-5 py-2 rounded-full ${mode === "video" ? "bg-bone" : ""}`}
                  >
                    <Text
                      className={`text-[11px] tracking-cap uppercase font-sans ${mode === "video" ? "text-espresso" : "text-bone"}`}
                    >
                      Video
                    </Text>
                  </Pressable>
                </View>
              </View>

            <View className="absolute bottom-0 left-0 right-0 pb-12 items-center">
              {mode === "video" ? (
                <Pressable
                  onPress={recordVideo}
                  className="h-20 w-20 rounded-full bg-clay border-4 border-bone active:opacity-80 items-center justify-center"
                >
                  <View className="h-7 w-7 bg-bone rounded-full" />
                </Pressable>
              ) : (
                <Pressable
                  onPress={snap}
                  disabled={snapping}
                  className={`h-20 w-20 rounded-full bg-gold border-4 border-bone active:bg-honey ${snapping ? "opacity-50" : ""}`}
                />
              )}
              <Text className="text-[11px] tracking-cap uppercase text-bone font-sans mt-4">
                {snapping
                  ? "Capturing…"
                  : mode === "video"
                    ? "Tap to record · 15 s max"
                    : "Tap to capture"}
              </Text>
            </View>
          </View>
        </Modal>

        <View className="px-6 pb-8">
          <View
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: 18,
              padding: 18,
              borderWidth: 1,
              borderColor: "rgba(31,79,71,0.06)",
              shadowColor: "#1F4F47",
              shadowOpacity: 0.05,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 3 },
              elevation: 2,
            }}
          >
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 10,
                letterSpacing: 1.4,
                textTransform: "uppercase",
                color: "#5FA89B",
                fontWeight: "600",
                marginBottom: 6,
              }}
            >
              Why four photos
            </Text>
            <Text
              style={{
                fontFamily: "Inter",
                fontSize: 13,
                color: "#4D423A",
                lineHeight: 19,
              }}
            >
              Dentists assess the front, upper arch, lower arch, and your
              specific problem area. The four together give a complete picture
              without needing a clinical visit.
            </Text>
          </View>
        </View>

        <View className="px-6 pb-24 items-center" style={{ gap: 10 }}>
          <Button
            variant="primary"
            size="lg"
            leftIcon={photos.allCaptured ? "arrow-right" : "camera"}
            onPress={() => {
              if (!photos.allCaptured) {
                openCamera(photos.nextSlot?.id ?? 1);
                return;
              }
              const photoUris = photos.slots
                .map((s) => s.uri)
                .filter((u): u is string => !!u);
              if (photoUris.length !== photos.slots.length) {
                Alert.alert(
                  "Photo missing",
                  "One of the photos didn't save. Please retake the empty slot.",
                );
                return;
              }
              // Captions aligned to photoUris by index; empty strings preserved.
              const photoCaptions = photos.slots.map((s) => (s.caption ?? "").trim());
              setIntake({
                photoUris,
                photoCaptions,
                photoQualityScore: photos.overallQuality,
              });
              router.push({ pathname: "/symptoms", params: { c: params.c } });
            }}
          >
            {photos.allCaptured
              ? "Continue"
              : `Capture ${photos.nextSlot?.label ?? "next"}`}
          </Button>
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 10,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "#6E6457",
              marginTop: 4,
            }}
          >
            {photos.capturedCount} of {photos.totalSlots} mapped
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
