/**
 * Ka-ching celebration sound.
 *
 * Two implementations:
 *   • Web — synthesises a 3-note major-triad arpeggio with Web Audio
 *     so the dentist hears something immediately in the browser preview
 *     and on web checkout. No asset bundling required.
 *   • Native (iOS/Android) — dynamic-imports expo-av; if the package
 *     isn't in the native bundle yet, no-ops gracefully. Add to the
 *     next native build via `npx expo install expo-av` to enable on
 *     device. Until then, native users get the haptic + visual moment
 *     only, which is still high-impact.
 *
 * Why no MP3 asset: shipping a binary asset through EAS Updates works,
 * but expo-av's Sound API still requires the native module on device.
 * Synthesising on web sidesteps the OTA/native split entirely, and
 * device users get the same celebration via haptic + animation.
 */
import { Platform } from "react-native";

let webCtx: AudioContext | null = null;

function getWebCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (webCtx) return webCtx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext })
      .AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  try {
    webCtx = new Ctor();
    return webCtx;
  } catch {
    return null;
  }
}

function playWebKaChing() {
  const ctx = getWebCtx();
  if (!ctx) return;
  // Resume if suspended (Chrome autoplay policy).
  if (ctx.state === "suspended") void ctx.resume().catch(() => {});

  // A bright, celebratory three-note arpeggio (C6 → E6 → G6) with a
  // shimmery decay tail. Reads as "ka-CHING" without being a literal
  // cash-register clip — keeps the editorial brand feel.
  const notes = [
    { freq: 1046.5, delay: 0, dur: 0.22 }, // C6
    { freq: 1318.5, delay: 0.08, dur: 0.22 }, // E6
    { freq: 1568.0, delay: 0.16, dur: 0.5 }, // G6 — sustains
  ];

  const master = ctx.createGain();
  master.gain.value = 0.22; // gentle — don't blow ears on first play
  master.connect(ctx.destination);

  for (const n of notes) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = n.freq;

    const env = ctx.createGain();
    const start = ctx.currentTime + n.delay;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(1, start + 0.01);
    env.gain.exponentialRampToValueAtTime(0.001, start + n.dur);

    osc.connect(env);
    env.connect(master);
    osc.start(start);
    osc.stop(start + n.dur + 0.05);
  }
}

let nativeMod: {
  Audio: {
    Sound: {
      createAsync: (
        source: unknown,
        initialStatus: { shouldPlay?: boolean; volume?: number },
      ) => Promise<{ sound: { unloadAsync: () => Promise<void> } }>;
    };
    setAudioModeAsync: (mode: Record<string, unknown>) => Promise<void>;
  };
} | null = null;
let nativeAttempted = false;

async function ensureNative(): Promise<void> {
  if (nativeAttempted) return;
  nativeAttempted = true;
  try {
    nativeMod = (await (
      Function("return import('expo-av')") as () => Promise<unknown>
    )()) as typeof nativeMod;
  } catch {
    nativeMod = null;
  }
}

async function playNativeKaChing() {
  await ensureNative();
  if (!nativeMod) return; // Package not yet in native bundle.
  // No bundled asset yet — leave a hook for when we add one. Native
  // users still get the haptic + visual celebration. Adding an asset
  // is a single-line change here once it ships in the next dev build.
  return;
}

/** Fire the celebratory ka-ching. Always safe to call. */
export function playWin() {
  if (Platform.OS === "web") {
    try {
      playWebKaChing();
    } catch {}
    return;
  }
  void playNativeKaChing().catch(() => {});
}
