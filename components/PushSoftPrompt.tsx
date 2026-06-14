import { useEffect, useState } from "react";
import { View, Text, Pressable, Platform, Linking } from "react-native";
import * as Notifications from "expo-notifications";
import { registerForPush } from "@/hooks/usePushRegistration";

const DISMISSED_KEY = "qms.pushSoftPromptDismissed";

/**
 * Soft prompt shown above the live feed once a quote arrives and we don't
 * have push permission. We never re-trigger the native dialog after a hard
 * deny — instead we link the user to Settings.
 *
 * Storage is purposely AsyncStorage-less; we use a module-level flag so the
 * prompt stays dismissed for the rest of the session. Hard-dismiss across
 * launches isn't required for App Review; we just don't want to nag in-session.
 */
let dismissedInSession = false;

export function PushSoftPrompt({ trigger }: { trigger: number }) {
  const [granted, setGranted] = useState<boolean | null>(null);
  const [askedThisSession, setAskedThisSession] = useState(false);
  const [hidden, setHidden] = useState(dismissedInSession);

  useEffect(() => {
    if (trigger <= 0) return;
    void Notifications.getPermissionsAsync().then((p) =>
      setGranted((p as { status: string }).status === "granted"),
    );
  }, [trigger]);

  if (hidden || granted === null || granted === true || trigger <= 0) return null;

  const handle = async () => {
    setAskedThisSession(true);
    const ok = await registerForPush();
    if (ok) {
      setGranted(true);
    } else if (Platform.OS === "ios") {
      // Hard deny — guide to Settings
      Linking.openURL("app-settings:").catch(() => {});
    }
  };

  return (
    <View className="mx-8 mt-3 mb-1 border border-gold/40 bg-bone p-4">
      <View className="flex-row items-center gap-3 mb-1">
        <View className="h-1.5 w-1.5 rounded-full bg-gold" />
        <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
          Get a heads-up for the next quote
        </Text>
      </View>
      <Text className="text-sm text-walnut font-sans leading-relaxed mb-3">
        Turn on notifications so you don't have to keep this screen open while
        more dentists send their quotes.
      </Text>
      <View className="flex-row gap-4">
        <Pressable onPress={handle}>
          <Text className="text-[11px] tracking-cap uppercase text-gold font-sans">
            {askedThisSession ? "Open Settings" : "Turn on"}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            dismissedInSession = true;
            setHidden(true);
          }}
        >
          <Text className="text-[11px] tracking-cap uppercase text-taupe font-sans">
            Not now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
