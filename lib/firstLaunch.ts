/**
 * First-launch detection — used to route new installs through onboarding once.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "qms.firstLaunchSeen";

export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const v = await AsyncStorage.getItem(KEY);
    return v === "1";
  } catch {
    return false;
  }
}

export async function markOnboardingSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, "1");
  } catch {}
}

export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {}
}
