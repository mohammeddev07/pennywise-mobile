import { Stack } from "expo-router";
import { tokens } from "@/shared/ui/theme/tokens";

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: tokens.colors.ink },
      }}
    >
      <Stack.Screen
        name="book-switcher"
        options={{
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "transparent" },
        }}
      />
    </Stack>
  );
}
