import { Stack } from "expo-router";
import { tokens } from "@/shared/ui/theme/tokens";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.app }
      }}
    />
  );
}
