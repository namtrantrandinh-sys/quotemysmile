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
import { BackBar } from "@/components/BackBar";
import { Button } from "@/components/Button";
import { ProgressDots } from "@/components/ProgressDots";
import { CameraOverlay } from "@/components/CameraOverlay";
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
  const [recording, setRecording] = useState(false);
  const [snapping, setSnapping] = useState(false);
  const [mode, setMode] = useState<"photo" | "video">("photo");
  // Default to BACK camera for every shot — dental photos need the rear
  // sensor (higher resolution + better light). User can flip manually.
  const [facing, setFacing] = useState<CameraType>("back");
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
    setFacing("back"); // every fresh open starts with the rear camera
    setActiveSlot(slotId);
  };

  const cancelCapture = () => {
    cancelledRef.current = true;
    if (recording) {
      try {
        cameraRef.current?.stopRecording();
      } catch {}
    }
    setRecording(false);
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

  const startRecording = async () => {
    if (!cameraRef.current || activeSlot == null) return;
    // Video also needs microphone permission on iOS.
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
    setRecording(true);
    try {
      const result = await cameraRef.current.recordAsync({
        maxDuration: 15,
      });
      if (result?.uri) {
        await photos.capture(activeSlot, result.uri, "video");
      }
    } catch (e) {
      Alert.alert(
        "Couldn't record",
        e instanceof Error ? e.message : "Try once more.",
      );
    } finally {
      setRecording(false);
      setActiveSlot(null);
    }
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
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

        <View className="px-8 mb-6">
          <PhotoInfoCard
            icon="camera"
            title="Clearer photo = more accurate quote"
            hint="On-camera guides show you exactly where to frame. Tap a slot to start."
            tone="gold"
          />
        </View>

        <PhotoTips
          tips={[
            { icon: "spark", label: "Daylight" },
            { icon: "scan", label: "Hold still" },
            { icon: "check", label: "Centre frame" },
          ]}
        />

        <View className="px-8 pb-12 gap-3">
          {photos.slots.map((s) => (
            <Pressable
              key={s.id}
              onPress={() => (s.uri ? handleRetake(s.id) : openCamera(s.id))}
              className={`border ${
                s.uri ? "border-gold bg-gold/5" : "border-linen bg-eggshell/40"
              } px-6 py-6 flex-row items-center justify-between active:bg-eggshell`}
            >
              <View className="flex-1">
                <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mb-2">
                  Photo {s.id} of {photos.totalSlots}
                </Text>
                <Text className="font-display text-xl text-espresso mb-1">
                  {s.label}
                </Text>
                <Text className="text-xs text-taupe font-sans">{s.hint}</Text>
                {s.qualityScore != null ? (
                  <Text className="text-[10px] tracking-cap uppercase text-forest font-sans mt-2">
                    Quality {s.qualityScore.toFixed(1)} / 5 · tap to retake
                  </Text>
                ) : null}
              </View>
              <Text className="font-display text-3xl text-gold ml-4">
                {s.uri ? "✓" : s.id === photos.nextSlot?.id ? "+" : "·"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Modal
          visible={activeSlot !== null}
          animationType="slide"
          onRequestClose={() => cancelCapture()}
        >
          <View className="flex-1 bg-onyx">
            {/* Remount CameraView on mode change. Switching picture↔video
                on a live CameraView is what was freezing the preview;
                a fresh mount lets the encoder configure cleanly. */}
            <CameraView
              key={`${mode}-${facing}`}
              ref={cameraRef}
              style={{ flex: 1 }}
              facing={facing}
              mode={mode === "photo" ? "picture" : "video"}
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
                    {recording ? "Stop & exit" : "Cancel"}
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
                {/* Flip camera button — top right of the top row, only
                    when not recording (flipping mid-record kills the file). */}
                <Pressable
                  onPress={() => {
                    if (recording) return;
                    flipCamera();
                  }}
                  hitSlop={12}
                  style={{
                    backgroundColor: "rgba(0,0,0,0.45)",
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: recording ? 0.4 : 1,
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
            {!recording ? (
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
            ) : null}

            <View className="absolute bottom-0 left-0 right-0 pb-12 items-center">
              {mode === "video" ? (
                <Pressable
                  onPress={recording ? stopRecording : startRecording}
                  className={`h-20 w-20 rounded-full ${recording ? "bg-clay" : "bg-gold"} border-4 border-bone active:opacity-80 items-center justify-center`}
                >
                  {recording ? (
                    <View className="h-7 w-7 bg-bone rounded-sm" />
                  ) : null}
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
                  : recording
                    ? "Tap to stop · 15 s max"
                    : mode === "video"
                      ? "Tap to record · 15 s"
                      : "Tap to capture"}
              </Text>
            </View>
          </View>
        </Modal>

        <View className="px-8 pb-12">
          <View className="border border-linen bg-eggshell/40 p-5">
            <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans mb-2">
              Why four photos
            </Text>
            <Text className="text-sm text-walnut font-sans leading-relaxed">
              Dentists assess the front, upper arch, lower arch, and your
              specific problem area. The four together give a complete picture
              without needing a clinical visit.
            </Text>
          </View>
        </View>

        <View className="px-8 pb-24 items-center">
          <Button
            variant="primary"
            size="lg"
            onPress={() => {
              if (!photos.allCaptured) {
                openCamera(photos.nextSlot?.id ?? 1);
                return;
              }
              // Type-safe collection: only include slots with a real uri.
              // Previously `.map(s => s.uri!).filter(Boolean)` could drop
              // an empty slot and silently shift downstream indices.
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
              setIntake({
                photoUris,
                photoQualityScore: photos.overallQuality,
              });
              router.push({ pathname: "/symptoms", params: { c: params.c } });
            }}
          >
            {photos.allCaptured
              ? "Continue"
              : `Capture ${photos.nextSlot?.label.toLowerCase() ?? "next"}`}
          </Button>
          <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans mt-4">
            {photos.capturedCount} of {photos.totalSlots} mapped
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
