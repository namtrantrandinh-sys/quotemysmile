/**
 * Tiny haptics wrapper. Dynamic-imports expo-haptics so the bundle still
 * builds if the package isn't installed yet (we treat haptics as opt-in
 * polish). On platforms without haptics (web), every call no-ops.
 *
 * To enable in dev/prod:
 *   npx expo install expo-haptics
 */
let mod: {
  impactAsync: (style: number) => Promise<void>;
  notificationAsync: (type: number) => Promise<void>;
  selectionAsync: () => Promise<void>;
  ImpactFeedbackStyle: { Light: number; Medium: number; Heavy: number };
  NotificationFeedbackType: { Success: number; Warning: number; Error: number };
} | null = null;
let initAttempted = false;

async function ensure(): Promise<void> {
  if (initAttempted) return;
  initAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mod = await (
      Function("return import('expo-haptics')") as () => Promise<unknown>
    )() as typeof mod;
  } catch {
    // Package not installed — silent.
  }
}

export function tap(kind: "light" | "medium" | "heavy" = "light") {
  void ensure().then(() => {
    if (!mod) return;
    const style =
      kind === "heavy"
        ? mod.ImpactFeedbackStyle.Heavy
        : kind === "medium"
          ? mod.ImpactFeedbackStyle.Medium
          : mod.ImpactFeedbackStyle.Light;
    void mod.impactAsync(style).catch(() => {});
  });
}

export function notify(kind: "success" | "warning" | "error" = "success") {
  void ensure().then(() => {
    if (!mod) return;
    const t =
      kind === "error"
        ? mod.NotificationFeedbackType.Error
        : kind === "warning"
          ? mod.NotificationFeedbackType.Warning
          : mod.NotificationFeedbackType.Success;
    void mod.notificationAsync(t).catch(() => {});
  });
}

export function selection() {
  void ensure().then(() => {
    mod?.selectionAsync().catch(() => {});
  });
}
