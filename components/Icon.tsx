import { View } from "react-native";

/**
 * Editorial line-icon library for QuoteMySmile.
 *
 * Built from absolutely-positioned styled Views (no SVG dep). Each icon is
 * 1px gold hairline strokes on transparent. Sized by `size` prop (default 48).
 *
 * Aesthetic rules:
 *  - 1px or 1.5px strokes, gold (#A9CFC0) by default
 *  - Minimal geometry — circles + lines + soft arcs
 *  - Never filled, never colourful — they read as engraved
 *  - Use sparingly: one hero icon per screen, one inline per row
 */

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export type IconName =
  | "camera"
  | "mouth"
  | "gps"
  | "radius"
  | "clock"
  | "emergency"
  | "tooth"
  | "smile"
  | "scan"
  | "chat"
  | "shield"
  | "spark"
  | "map-pin"
  | "info"
  | "check"
  | "lock"
  | "calendar"
  | "phone"
  | "list"
  | "map";

export function Icon({ name, size = 48, color = "#A9CFC0" }: Props) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {render(name, size, color)}
    </View>
  );
}

function render(name: IconName, s: number, c: string) {
  const u = s / 48; // 1 unit = s/48 px
  switch (name) {
    case "camera":
      return (
        <>
          {/* Body */}
          <View
            style={{
              width: 36 * u,
              height: 26 * u,
              borderWidth: 1,
              borderColor: c,
              borderRadius: 2 * u,
              alignItems: "center",
              justifyContent: "center",
            }}
          />
          {/* Lens outer */}
          <View
            style={{
              position: "absolute",
              width: 14 * u,
              height: 14 * u,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: c,
            }}
          />
          {/* Lens dot */}
          <View
            style={{
              position: "absolute",
              width: 4 * u,
              height: 4 * u,
              borderRadius: 999,
              backgroundColor: c,
            }}
          />
          {/* Top hump */}
          <View
            style={{
              position: "absolute",
              top: 8 * u,
              width: 10 * u,
              height: 4 * u,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: c,
              borderTopLeftRadius: 1 * u,
              borderTopRightRadius: 1 * u,
            }}
          />
        </>
      );

    case "mouth":
    case "smile":
      return (
        <>
          {/* Upper arch */}
          <View
            style={{
              width: 32 * u,
              height: 8 * u,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: c,
              borderTopLeftRadius: 999,
              borderTopRightRadius: 999,
              marginBottom: 2 * u,
            }}
          />
          {/* Centre line */}
          <View
            style={{
              width: 28 * u,
              height: 1,
              backgroundColor: c,
              opacity: 0.5,
              marginBottom: 2 * u,
            }}
          />
          {/* Lower arch */}
          <View
            style={{
              width: 32 * u,
              height: 12 * u,
              borderBottomWidth: 1,
              borderLeftWidth: 1,
              borderRightWidth: 1,
              borderColor: c,
              borderBottomLeftRadius: 999,
              borderBottomRightRadius: 999,
            }}
          />
        </>
      );

    case "gps":
    case "map-pin":
      return (
        <>
          {/* Outer pin */}
          <View
            style={{
              width: 24 * u,
              height: 24 * u,
              borderWidth: 1,
              borderColor: c,
              borderRadius: 999,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 6 * u,
            }}
          >
            <View
              style={{
                width: 6 * u,
                height: 6 * u,
                borderRadius: 999,
                backgroundColor: c,
              }}
            />
          </View>
          {/* Stem */}
          <View
            style={{
              position: "absolute",
              bottom: 6 * u,
              width: 1,
              height: 8 * u,
              backgroundColor: c,
            }}
          />
          {/* Base dot */}
          <View
            style={{
              position: "absolute",
              bottom: 4 * u,
              width: 4 * u,
              height: 4 * u,
              borderRadius: 999,
              backgroundColor: c,
            }}
          />
        </>
      );

    case "radius":
      return (
        <>
          {/* Outer ring */}
          <View
            style={{
              width: 38 * u,
              height: 38 * u,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: c,
              opacity: 0.4,
              alignItems: "center",
              justifyContent: "center",
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 22 * u,
              height: 22 * u,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: c,
              opacity: 0.7,
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 6 * u,
              height: 6 * u,
              borderRadius: 999,
              backgroundColor: c,
            }}
          />
        </>
      );

    case "clock":
      return (
        <>
          <View
            style={{
              width: 30 * u,
              height: 30 * u,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: c,
            }}
          />
          {/* hour */}
          <View
            style={{
              position: "absolute",
              width: 1,
              height: 9 * u,
              backgroundColor: c,
              top: 12 * u,
            }}
          />
          {/* minute */}
          <View
            style={{
              position: "absolute",
              width: 12 * u,
              height: 1,
              backgroundColor: c,
              left: 24 * u,
            }}
          />
          {/* centre */}
          <View
            style={{
              position: "absolute",
              width: 3 * u,
              height: 3 * u,
              borderRadius: 999,
              backgroundColor: c,
            }}
          />
        </>
      );

    case "emergency":
      return (
        <>
          {/* Triangle outline */}
          <View
            style={{
              width: 0,
              height: 0,
              borderLeftWidth: 18 * u,
              borderRightWidth: 18 * u,
              borderBottomWidth: 30 * u,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderBottomColor: c,
              opacity: 0.15,
            }}
          />
          {/* Exclamation mark */}
          <View
            style={{
              position: "absolute",
              top: 14 * u,
              width: 1.5,
              height: 10 * u,
              backgroundColor: c,
            }}
          />
          <View
            style={{
              position: "absolute",
              bottom: 8 * u,
              width: 3 * u,
              height: 3 * u,
              borderRadius: 999,
              backgroundColor: c,
            }}
          />
        </>
      );

    case "tooth":
      return (
        <>
          {/* Crown */}
          <View
            style={{
              width: 22 * u,
              height: 18 * u,
              borderTopLeftRadius: 11 * u,
              borderTopRightRadius: 11 * u,
              borderWidth: 1,
              borderColor: c,
              borderBottomWidth: 0,
            }}
          />
          {/* Roots */}
          <View
            style={{
              flexDirection: "row",
              gap: 6 * u,
            }}
          >
            <View
              style={{
                width: 6 * u,
                height: 10 * u,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderColor: c,
                borderBottomLeftRadius: 4 * u,
              }}
            />
            <View
              style={{
                width: 6 * u,
                height: 10 * u,
                borderLeftWidth: 1,
                borderRightWidth: 1,
                borderBottomWidth: 1,
                borderColor: c,
                borderBottomRightRadius: 4 * u,
              }}
            />
          </View>
        </>
      );

    case "scan":
      return (
        <>
          {/* Outer oval (face) */}
          <View
            style={{
              width: 26 * u,
              height: 34 * u,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: c,
              opacity: 0.5,
            }}
          />
          {/* Scan ring overlay */}
          <View
            style={{
              position: "absolute",
              width: 26 * u,
              height: 34 * u,
              borderRadius: 999,
              borderTopWidth: 1,
              borderLeftWidth: 1,
              borderColor: c,
              transform: [{ rotate: "20deg" }],
            }}
          />
          {/* Crosshair */}
          <View
            style={{ position: "absolute", width: 8 * u, height: 1, backgroundColor: c }}
          />
          <View
            style={{ position: "absolute", width: 1, height: 8 * u, backgroundColor: c }}
          />
        </>
      );

    case "chat":
      return (
        <>
          <View
            style={{
              width: 32 * u,
              height: 22 * u,
              borderWidth: 1,
              borderColor: c,
              borderRadius: 2 * u,
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "row",
              gap: 4 * u,
            }}
          >
            <View style={{ width: 3 * u, height: 3 * u, borderRadius: 999, backgroundColor: c }} />
            <View style={{ width: 3 * u, height: 3 * u, borderRadius: 999, backgroundColor: c }} />
            <View style={{ width: 3 * u, height: 3 * u, borderRadius: 999, backgroundColor: c }} />
          </View>
          <View
            style={{
              position: "absolute",
              bottom: 6 * u,
              left: 12 * u,
              width: 0,
              height: 0,
              borderLeftWidth: 5 * u,
              borderRightWidth: 5 * u,
              borderTopWidth: 6 * u,
              borderLeftColor: "transparent",
              borderRightColor: "transparent",
              borderTopColor: c,
            }}
          />
        </>
      );

    case "shield":
      return (
        <View
          style={{
            width: 28 * u,
            height: 34 * u,
            borderWidth: 1,
            borderColor: c,
            borderTopLeftRadius: 4 * u,
            borderTopRightRadius: 4 * u,
            borderBottomLeftRadius: 999,
            borderBottomRightRadius: 999,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: 10 * u, height: 10 * u, borderRadius: 999, backgroundColor: c }} />
        </View>
      );

    case "spark":
      return (
        <>
          {/* Vertical bar */}
          <View
            style={{
              position: "absolute",
              width: 1,
              height: 28 * u,
              backgroundColor: c,
            }}
          />
          {/* Horizontal bar */}
          <View
            style={{
              position: "absolute",
              width: 28 * u,
              height: 1,
              backgroundColor: c,
            }}
          />
          {/* Diagonal 1 */}
          <View
            style={{
              position: "absolute",
              width: 16 * u,
              height: 1,
              backgroundColor: c,
              opacity: 0.5,
              transform: [{ rotate: "45deg" }],
            }}
          />
          {/* Diagonal 2 */}
          <View
            style={{
              position: "absolute",
              width: 16 * u,
              height: 1,
              backgroundColor: c,
              opacity: 0.5,
              transform: [{ rotate: "-45deg" }],
            }}
          />
          {/* Centre dot */}
          <View
            style={{
              position: "absolute",
              width: 4 * u,
              height: 4 * u,
              borderRadius: 999,
              backgroundColor: c,
            }}
          />
        </>
      );

    case "info":
      return (
        <View
          style={{
            width: 30 * u,
            height: 30 * u,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View style={{ width: 3 * u, height: 3 * u, borderRadius: 999, backgroundColor: c, marginBottom: 2 * u }} />
          <View style={{ width: 1.5, height: 10 * u, backgroundColor: c }} />
        </View>
      );

    case "check":
      return (
        <View
          style={{
            width: 30 * u,
            height: 30 * u,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: c,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              width: 6 * u,
              height: 1.5,
              backgroundColor: c,
              transform: [{ rotate: "45deg" }, { translateX: -3 * u }, { translateY: 2 * u }],
            }}
          />
          <View
            style={{
              position: "absolute",
              width: 12 * u,
              height: 1.5,
              backgroundColor: c,
              transform: [{ rotate: "-45deg" }, { translateX: 1 * u }],
            }}
          />
        </View>
      );

    case "lock":
      return (
        <>
          {/* Shackle */}
          <View
            style={{
              width: 16 * u,
              height: 12 * u,
              borderTopLeftRadius: 999,
              borderTopRightRadius: 999,
              borderWidth: 1,
              borderColor: c,
              borderBottomWidth: 0,
            }}
          />
          {/* Body */}
          <View
            style={{
              width: 22 * u,
              height: 18 * u,
              borderWidth: 1,
              borderColor: c,
              borderRadius: 2 * u,
              alignItems: "center",
              justifyContent: "center",
              marginTop: -1,
            }}
          >
            <View style={{ width: 2 * u, height: 6 * u, backgroundColor: c }} />
          </View>
        </>
      );

    case "calendar":
      return (
        <View
          style={{
            width: 32 * u,
            height: 30 * u,
            borderWidth: 1,
            borderColor: c,
            borderRadius: 2 * u,
            alignItems: "center",
          }}
        >
          {/* Top binder strip */}
          <View
            style={{
              width: "100%",
              height: 6 * u,
              borderBottomWidth: 1,
              borderColor: c,
              flexDirection: "row",
              justifyContent: "space-between",
              paddingHorizontal: 6 * u,
              alignItems: "center",
            }}
          >
            <View style={{ width: 1.5, height: 3 * u, backgroundColor: c }} />
            <View style={{ width: 1.5, height: 3 * u, backgroundColor: c }} />
          </View>
          {/* Date dots */}
          <View
            style={{
              flex: 1,
              flexDirection: "row",
              flexWrap: "wrap",
              gap: 2 * u,
              alignItems: "center",
              justifyContent: "center",
              padding: 3 * u,
            }}
          >
            {Array.from({ length: 9 }).map((_, i) => (
              <View
                key={i}
                style={{
                  width: 2 * u,
                  height: 2 * u,
                  backgroundColor: i === 4 ? c : "transparent",
                  borderWidth: i === 4 ? 0 : 0.5,
                  borderColor: c,
                  borderRadius: 999,
                }}
              />
            ))}
          </View>
        </View>
      );

    case "phone":
      return (
        <View
          style={{
            width: 22 * u,
            height: 34 * u,
            borderWidth: 1,
            borderColor: c,
            borderRadius: 3 * u,
            alignItems: "center",
            paddingTop: 4 * u,
          }}
        >
          <View style={{ width: 8 * u, height: 1.5, backgroundColor: c, marginBottom: 3 * u }} />
          <View style={{ flex: 1, width: "70%", alignItems: "center", justifyContent: "flex-end", paddingBottom: 4 * u }}>
            <View style={{ width: 4 * u, height: 4 * u, borderRadius: 999, borderWidth: 1, borderColor: c }} />
          </View>
        </View>
      );

    case "list":
      return (
        <>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 * u, marginBottom: 4 * u }}>
              <View style={{ width: 3 * u, height: 3 * u, borderRadius: 999, backgroundColor: c }} />
              <View style={{ width: 22 * u, height: 1, backgroundColor: c }} />
            </View>
          ))}
        </>
      );

    case "map":
      return (
        <View
          style={{
            width: 36 * u,
            height: 30 * u,
            borderWidth: 1,
            borderColor: c,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: 12 * u,
              width: 1,
              backgroundColor: c,
              opacity: 0.4,
            }}
          />
          <View
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 10 * u,
              width: 1,
              backgroundColor: c,
              opacity: 0.4,
            }}
          />
          <View style={{ width: 4 * u, height: 4 * u, borderRadius: 999, backgroundColor: c }} />
        </View>
      );

    default:
      return null;
  }
}
