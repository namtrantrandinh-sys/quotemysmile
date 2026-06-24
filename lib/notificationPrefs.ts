/**
 * Per-user notification + celebration preferences.
 *
 * Stored locally with AsyncStorage so we don't need a DB migration for
 * the toggles. The "win celebration" trio (sound / haptic / push) is
 * what the dentist sees in Settings → Notifications. Patient defaults
 * are the same; they don't currently have a settings screen for it.
 *
 * Server-side push muting still has to live on the DB long-term, but
 * for now the push toggle short-circuits at the client receiver — the
 * dashboard simply doesn't show the celebration banner when push is
 * off. The actual OS-level push opt-out is the iOS Settings switch.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationPrefs = {
  winSound: boolean;
  winHaptic: boolean;
  winPush: boolean;
};

const KEY = "qms.notificationPrefs.v1";

export const DEFAULT_PREFS: NotificationPrefs = {
  winSound: true,
  winHaptic: true,
  winPush: true,
};

export async function getPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>;
    return { ...DEFAULT_PREFS, ...parsed };
  } catch {
    return DEFAULT_PREFS;
  }
}

export async function setPrefs(next: Partial<NotificationPrefs>): Promise<NotificationPrefs> {
  const current = await getPrefs();
  const merged = { ...current, ...next };
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  } catch {}
  return merged;
}
