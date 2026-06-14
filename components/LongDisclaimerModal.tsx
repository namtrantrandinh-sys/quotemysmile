import { Modal, View, Text, ScrollView, Pressable } from "react-native";
import { Button } from "./Button";
import { DISCLAIMER } from "@/lib/copy";

type Props = {
  visible: boolean;
  onAccept: () => void;
};

export function LongDisclaimerModal({ visible, onAccept }: Props) {
  return (
    <Modal visible={visible} animationType="fade" transparent>
      <View className="flex-1 bg-onyx/40 items-center justify-center px-6">
        <View className="bg-bone max-w-md w-full p-8 rounded-sm border border-linen">
          <Text className="text-[11px] tracking-editorial uppercase text-taupe font-sans mb-6">
            Before your first quote
          </Text>
          <Text className="font-display text-3xl text-espresso mb-6 leading-[1.1]">
            How our quotes work.
          </Text>
          <ScrollView style={{ maxHeight: 280 }} className="mb-8">
            <Text className="text-sm text-walnut font-sans leading-relaxed">
              {DISCLAIMER.long}
            </Text>
          </ScrollView>
          <View className="items-center">
            <Button variant="primary" size="md" onPress={onAccept}>
              I understand
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
}
