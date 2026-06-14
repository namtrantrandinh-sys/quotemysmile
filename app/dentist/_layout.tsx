import { Stack } from "expo-router";

export default function DentistLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#F5F1E8" },
        animation: "fade",
      }}
    />
  );
}
