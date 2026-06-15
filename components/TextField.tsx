import { TextInput, type TextInputProps } from "react-native";

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  maxLength?: number;
  autoFocus?: boolean;
  // Optional escape hatch for callers that want native autoComplete hints.
  textContentType?: TextInputProps["textContentType"];
  autoComplete?: TextInputProps["autoComplete"];
};

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType = "default",
  maxLength,
  autoFocus,
  textContentType,
  autoComplete,
}: Props) {
  // Apply colours / sizes via the `style` prop (not className) because
  // NativeWind v4 doesn't reliably propagate `color` to the native TextInput
  // glyph on iOS — the result was invisible text on cream.
  const isPhone = keyboardType === "phone-pad";
  const isEmail = keyboardType === "email-address";

  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#BFB29F"
      multiline={multiline}
      keyboardType={keyboardType}
      maxLength={maxLength}
      autoFocus={autoFocus}
      // Stop iOS from auto-correcting / capitalising phone & email entries —
      // the keyboard suggestion bar otherwise swallows keystrokes.
      autoCorrect={false}
      autoCapitalize={isPhone || isEmail ? "none" : "sentences"}
      spellCheck={false}
      textContentType={
        textContentType ?? (isPhone ? "telephoneNumber" : isEmail ? "emailAddress" : "none")
      }
      autoComplete={autoComplete ?? (isPhone ? "tel" : isEmail ? "email" : "off")}
      // Inline styling — guarantees text + caret are visible regardless of
      // NativeWind class resolution on the native input.
      style={[
        {
          fontFamily: "Inter",
          fontSize: 16,
          color: "#2A2520",
          paddingVertical: 8,
          paddingHorizontal: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#E8E0CD",
          backgroundColor: "transparent",
        },
        multiline ? { minHeight: 90, textAlignVertical: "top" } : null,
      ]}
    />
  );
}
