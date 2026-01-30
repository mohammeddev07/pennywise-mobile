import { Stack } from "expo-router";
import { tokens } from "@/shared/ui/theme/tokens";

export default function ModalsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="book-switcher"
        options={{ contentStyle: { backgroundColor: tokens.colors.app } }}
      />

      {/* Add Transaction flow = pure black */}
      <Stack.Screen
        name="add-transaction"
        options={{ contentStyle: { backgroundColor: tokens.colors.ink } }}
      />
      <Stack.Screen
        name="add-transaction/review"
        options={{ contentStyle: { backgroundColor: tokens.colors.ink } }}
      />
      <Stack.Screen
        name="add-transaction/success"
        options={{ contentStyle: { backgroundColor: tokens.colors.ink } }}
      />
    </Stack>
  );
}
