import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Wordmark } from "./Wordmark";

type Props = { title?: string; right?: React.ReactNode };

/**
 * BackBar layout — two-row when both title AND right are present.
 *
 * Why two rows:
 *   The previous single-row layout placed Back · Title · Right on one line.
 *   When Right was a wide control (e.g. <ProgressDots step={4} total={6}/>
 *   on the location/urgency steps), the dots visually overran the absolutely
 *   centred title — "STEP 04 · LOCATION" appeared as "STEP 04 · L—————ION".
 *   Stacking gives the title its own clean row and lets the dots sit beside
 *   the Back button without competition.
 *
 * Behaviour:
 *   - title only → single row, title centred
 *   - right only → single row, Back left, right right (no title)
 *   - title + right → two rows: row 1 has Back ↔ Right, row 2 has title
 *   - neither → single row with the Wordmark centred
 */
export function BackBar({ title, right }: Props) {
  const router = useRouter();
  const stacked = !!title && !!right;

  // Why a guarded back handler:
  //   router.back() is a silent no-op when there's no history (e.g. user
  //   deep-linked from a notification, restored after a crash, or landed
  //   here via router.replace). Without a fallback the Back button just
  //   does nothing and users think the app is broken. Fall back to home.
  const handleBack = () => {
    if (router.canGoBack?.()) {
      router.back();
    } else {
      router.replace("/");
    }
  };

  return (
    <View className="px-6 pt-6 pb-4 border-b border-linen">
      {/* Row 1 — Back ↔ Right (or centred title/wordmark when no right) */}
      <View className="flex-row items-center justify-between relative">
        <Pressable
          onPress={handleBack}
          hitSlop={12}
          style={{ minWidth: 60, zIndex: 2 }}
        >
          <Text className="text-[11px] tracking-cap uppercase text-walnut font-sans">
            ← Back
          </Text>
        </Pressable>

        {/* Single-row centred slot only when not stacked */}
        {!stacked && title ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 80,
              right: 80,
              top: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              className="text-[11px] tracking-editorial uppercase text-taupe font-sans"
            >
              {title}
            </Text>
          </View>
        ) : null}

        {!stacked && !title ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 80,
              right: 80,
              top: 0,
              bottom: 0,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Wordmark size="sm" />
          </View>
        ) : null}

        <View
          className="items-end"
          style={{ minWidth: 60, zIndex: 2 }}
        >
          {right ?? null}
        </View>
      </View>

      {/* Row 2 — title centred on its own line when both title and right exist */}
      {stacked ? (
        <View className="items-center pt-3">
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.85}
            className="text-[11px] tracking-editorial uppercase text-taupe font-sans"
          >
            {title}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
