import { TextInput } from "react-native";

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric" | "email-address" | "phone-pad";
  maxLength?: number;
};

export function TextField({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType = "default",
  maxLength,
}: Props) {
  return (
    <TextInput
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#BFB29F"
      multiline={multiline}
      keyboardType={keyboardType}
      maxLength={maxLength}
      className="font-sans text-espresso text-base bg-bone border-b border-linen pb-3"
      style={multiline ? { minHeight: 90, textAlignVertical: "top" } : undefined}
    />
  );
}
