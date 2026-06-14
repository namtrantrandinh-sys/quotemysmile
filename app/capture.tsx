import { useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, Modal } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
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
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const cameraRef = useRef<CameraView | null>(null);

  const openCamera = async (slotId: number) => {
    if (!permission?.granted) {
      const r = await requestPermission();
      if (!r.granted) return;
    }
    setActiveSlot(slotId);
  };

  const snap = async () => {
    if (!cameraRef.current || activeSlot == null) return;
    const result = await cameraRef.current.takePictureAsync({ quality: 0.9 });
    if (result?.uri) await photos.capture(activeSlot, result.uri);
    setActiveSlot(null);
    // Auto-advance: open next un-captured slot
    const next = photos.slots.find((s) => !s.uri && s.id !== activeSlot);
    if (next) {
      setTimeout(() => openCamera(next.id), 600);
    }
  };

  const activeSlotObj = activeSlot != null ? photos.slots[activeSlot - 1] : null;
  const facing = activeSlotObj?.name === "front-smile" ? "front" : "back";

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
              onPress={() => (s.uri ? photos.retake(s.id) : openCamera(s.id))}
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
          onRequestClose={() => setActiveSlot(null)}
        >
          <View className="flex-1 bg-onyx">
            <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing} />
            {activeSlot !== null && activeSlotObj ? (
              <CameraOverlay
                slotName={activeSlotObj.label}
                slotIndex={activeSlot}
                total={photos.totalSlots}
                guideShape={activeSlotObj.guideShape}
              />
            ) : null}
            <View className="absolute top-0 left-0 right-0 px-6 pt-12 flex-row justify-between">
              <Pressable onPress={() => setActiveSlot(null)}>
                <Text className="text-[11px] tracking-cap uppercase text-bone font-sans">
                  Cancel
                </Text>
              </Pressable>
              <Text className="text-[11px] tracking-cap uppercase text-bone font-sans">
                Natural light · no flash
              </Text>
            </View>
            <View className="absolute bottom-0 left-0 right-0 pb-12 items-center">
              <Pressable
                onPress={snap}
                className="h-20 w-20 rounded-full bg-gold border-4 border-bone active:bg-honey"
              />
              <Text className="text-[11px] tracking-cap uppercase text-bone font-sans mt-4">
                Tap to capture
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
              setIntake({
                photoUris: photos.slots
                  .map((s) => s.uri!)
                  .filter(Boolean),
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
