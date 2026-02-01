import { View, Text } from "react-native";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { Button } from "@/shared/ui/components/Button";

import { useBooksStore } from "@/features/books/useBooksStore";
import { useOnboardingStore } from "@/features/onboarding/useOnboardingStore";

export default function StartTrackingScreen() {
  const selectedBookId = useBooksStore((s) => s.selectedBookId);
  const currency = useOnboardingStore((s) => s.currency);

  return (
    <View className="flex-1 bg-app px-6 pt-16 pb-10">
      <Text className="text-text text-2xl font-semibold">Time to start tracking</Text>
      <Text className="text-muted mt-2 text-base leading-6">
        Book: {selectedBookId ?? "—"} · Currency: {currency ?? "—"}
      </Text>

      <View className="mt-10 flex-1 rounded-2xl border border-stroke bg-surface items-center justify-center">
        <Text className="text-muted">Success illustration placeholder</Text>
      </View>

      <View className="mt-8 gap-3">
        <Button
          label="Continue"
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
            router.replace("/(tabs)/home");
          }}
        />
      </View>
    </View>
  );
}
