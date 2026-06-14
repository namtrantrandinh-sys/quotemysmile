import { View, Text, Pressable } from "react-native";

type Props = {
  value: string;
  onChange: (v: string) => void;
  options: { id: string; label: string }[];
};

/**
 * Editorial pill segmented toggle — used for List / Map switch.
 */
export function ViewToggle({ value, onChange, options }: Props) {
  return (
    <View className="flex-row border border-linen bg-bone p-1 rounded-sm">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <Pressable
            key={o.id}
            onPress={() => onChange(o.id)}
            className={`px-4 py-2 rounded-sm ${active ? "bg-espresso" : ""}`}
          >
            <Text
              className={`text-[11px] tracking-cap uppercase font-sans ${
                active ? "text-bone" : "text-walnut"
              }`}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
