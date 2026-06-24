import { View, Text, Pressable } from "react-native";
import { Icon } from "@/components/Icon";

export type AhpraStatus =
  | "unknown"
  | "pending"
  | "active"
  | "conditional"
  | "suspended"
  | "not_found";

export type AbnStatus = "unknown" | "pending" | "verified" | "invalid";

type Props = {
  ahpra: AhpraStatus;
  abn: AbnStatus;
  ahpraRegType?: string | null;
  onRecheck?: () => void;
  rechecking?: boolean;
};

/**
 * Compact verification card shown above the dentist dashboard.
 * Renders four states:
 *   - all green     → minimal "Verified" pill (no banner if both pass)
 *   - pending       → ivory eggshell + clock icon
 *   - blocked       → clay accent + cannot-quote message
 *   - conditional   → gold accent + flag for review
 */
export function VerificationBanner({
  ahpra,
  abn,
  ahpraRegType,
  onRecheck,
  rechecking,
}: Props) {
  const ahpraOk = ahpra === "active" || ahpra === "conditional";
  const abnOk = abn === "verified";
  const blocked = ahpra === "suspended" || ahpra === "not_found" || abn === "invalid";
  const pending =
    !blocked &&
    !(ahpraOk && abnOk) &&
    (ahpra === "pending" ||
      abn === "pending" ||
      ahpra === "unknown" ||
      abn === "unknown");

  if (ahpraOk && abnOk) {
    return (
      <View className="border border-forest/30 bg-forest/5 px-5 py-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-1.5 w-1.5 rounded-full bg-forest" />
          <Text className="text-[10px] tracking-cap uppercase text-forest font-sans">
            Verified · AHPRA {ahpra === "conditional" ? "(conditions)" : "active"}
            {ahpraRegType ? ` · ${ahpraRegType}` : ""} · ABN clean
          </Text>
        </View>
        {onRecheck ? (
          <Pressable onPress={onRecheck} disabled={rechecking}>
            <Text className="text-[10px] tracking-cap uppercase text-walnut font-sans">
              {rechecking ? "Checking…" : "Recheck"}
            </Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  if (blocked) {
    return (
      <View className="border border-clay/40 bg-clay/5 p-5">
        <View className="flex-row items-center gap-3 mb-2">
          <Icon name="emergency" size={18} color="#9E5E47" />
          <Text className="text-[11px] tracking-cap uppercase text-clay font-sans">
            Verification blocked
          </Text>
        </View>
        <Text className="text-sm text-walnut font-sans leading-relaxed mb-3">
          {ahpra === "suspended"
            ? "Your AHPRA registration shows as suspended or cancelled. You cannot quote until it's restored."
            : ahpra === "not_found"
              ? "We couldn't find your AHPRA number on the public register. Double-check the number and try again."
              : "Your ABN couldn't be verified against the public ABR register. Update it in settings and recheck."}
        </Text>
        <View className="flex-row gap-4">
          {onRecheck ? (
            <Pressable onPress={onRecheck} disabled={rechecking}>
              <Text className="text-[11px] tracking-cap uppercase text-clay font-sans">
                {rechecking ? "Rechecking…" : "Recheck now"}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  if (pending) {
    // Compact pending card. The previous treatment was a fat eggshell
    // panel with three paragraphs of body copy + ghost text recheck.
    // It dominated the dashboard for what is really just a "stay tuned"
    // status. New version: one-line headline + two tight rows + a real
    // mint-gradient Recheck pill so the dentist has a clear action.
    return (
      <View
        style={{
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          borderWidth: 1,
          borderColor: "rgba(31,79,71,0.12)",
          paddingHorizontal: 16,
          paddingVertical: 14,
          shadowColor: "#2E7268",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 2,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <Icon name="clock" size={16} color="#2E7268" />
          <Text
            style={{
              fontFamily: "Inter",
              fontSize: 11,
              letterSpacing: 1.4,
              textTransform: "uppercase",
              color: "#2E7268",
              fontWeight: "700",
              flex: 1,
            }}
          >
            Verifying credentials · under a minute
          </Text>
        </View>
        <View style={{ gap: 6, marginBottom: 12 }}>
          <Row
            label="AHPRA registration"
            state={ahpra === "active" || ahpra === "conditional" ? "ok" : "pending"}
          />
          <Row label="ABN" state={abn === "verified" ? "ok" : "pending"} />
        </View>
        {onRecheck ? (
          <View
            style={{
              alignSelf: "stretch",
              borderRadius: 12,
              backgroundColor: rechecking ? "#7BC5B5" : "#2E7268",
              overflow: "hidden",
            }}
          >
            <Pressable
              onPress={onRecheck}
              disabled={rechecking}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}
            >
              <View
                style={{
                  paddingVertical: 11,
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: 42,
                  flexDirection: "row",
                  gap: 8,
                }}
              >
                <Icon name="clock" size={14} color="#FFFFFF" />
                <Text
                  style={{
                    fontFamily: "Inter",
                    fontSize: 12,
                    letterSpacing: 1.6,
                    textTransform: "uppercase",
                    color: "#FFFFFF",
                    fontWeight: "700",
                  }}
                >
                  {rechecking ? "Rechecking…" : "Recheck now"}
                </Text>
              </View>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
  }

  return null;
}

function Row({ label, state }: { label: string; state: "ok" | "pending" }) {
  return (
    <View className="flex-row items-center gap-3">
      <View
        className={`h-1.5 w-1.5 rounded-full ${
          state === "ok" ? "bg-forest" : "bg-taupe"
        }`}
      />
      <Text className="text-xs text-walnut font-sans">{label}</Text>
      <View className="flex-1" />
      <Text className="text-[10px] tracking-cap uppercase text-taupe font-sans">
        {state === "ok" ? "Verified" : "Pending"}
      </Text>
    </View>
  );
}
