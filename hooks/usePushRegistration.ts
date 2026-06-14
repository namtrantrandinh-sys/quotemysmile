/**
 * usePushRegistration — registers the device for Expo push notifications
 * and stores the token in users.push_token so the backend can target.
 *
 * Permissions:
 *   - iOS: requestPermissionsAsync prompts for alerts/badges/sounds
 *   - Android: notifications channel created on first use
 *
 * Privacy: token is per-install; revoked on signOut.
 */
import { useCallback, useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "@/lib/supabase";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Imperatively register for push. Returns `granted`. Safe to call any number
 * of times — the OS dedupes the prompt after the first decision.
 *
 * On a re-ask after a hard deny, iOS won't prompt again until the app is
 * deleted + reinstalled; the helper returns false so the caller can render
 * "Open Settings" copy instead.
 */
export async function registerForPush(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "QuoteMySmile",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 200, 100, 200],
        lightColor: "#C9A961",
      });
    }
    const existing = (await Notifications.getPermissionsAsync()) as {
      status: string;
    };
    let granted = existing.status === "granted";
    if (!granted) {
      const req = (await Notifications.requestPermissionsAsync()) as {
        status: string;
      };
      granted = req.status === "granted";
    }
    if (!granted) return false;
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !token) return false;
    await supabase
      .from("users")
      .update({ push_token: token })
      .eq("id", user.id);
    return true;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[QMS] push register failed", e);
    return false;
  }
}

/**
 * Hook that fires registration on mount. Returns the current permission
 * state and an imperative re-ask helper so screens can show a soft prompt.
 */
export function usePushRegistration() {
  const [granted, setGranted] = useState<boolean | null>(null);

  useEffect(() => {
    void registerForPush().then((ok) => setGranted(ok));
  }, []);

  const reask = useCallback(async () => {
    const ok = await registerForPush();
    setGranted(ok);
    return ok;
  }, []);

  return { granted, reask };
}
