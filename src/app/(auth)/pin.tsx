import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { PinDots } from "@/shared/ui/components/PinDots";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { DEMO_PIN, useAuthStore } from "@/features/auth/store";

export default function PinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const didNavigateRef = useRef(false);
  const unlockDemo = useAuthStore((s) => s.unlockDemo);
  const onboardingCompleted = useAuthStore((s) => s.onboardingCompleted);

  const handleBack = () => {
    const canGoBack = typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;

    if (canGoBack) router.back();
    else router.replace("/(auth)/welcome");
  };

  const onKey = (k: Key) => {
    setError("");
    setPin((prev) => {
      if (k === "back") return prev.slice(0, -1);
      if (k === ".") return prev;
      if (prev.length >= 4) return prev;
      return prev + k;
    });
  };

  useEffect(() => {
    if (pin.length !== 4) return;
    if (didNavigateRef.current) return;

    if (pin === DEMO_PIN) {
      didNavigateRef.current = true;
      unlockDemo();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace(onboardingCompleted ? "/(tabs)/home" : "/(onboarding)/books");
      return;
    }

    setError("That PIN did not match. Try 1234 for this demo.");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    const t = setTimeout(() => setPin(""), 250);
    return () => clearTimeout(t);
  }, [onboardingCompleted, pin, router, unlockDemo]);

  return (
    <View className="flex-1 bg-app px-6 pt-14 pb-10">
      <View className="flex-row items-center">
        <HapticPressable
          onPress={handleBack}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={20} color={tokens.colors.text} />
        </HapticPressable>

        <View className="ml-3">
          <AppText variant="xl">Secure your account</AppText>
          <AppText variant="sm" tone="muted" className="mt-1">
            Enter your 4-digit PIN
          </AppText>
        </View>
      </View>

      <View className="mt-14 items-center">
        <PinDots length={4} filled={pin.length} />
        <AppText variant="xs" tone="muted" className="mt-4">
          Demo access PIN: 1234
        </AppText>

        {error ? (
          <AppText variant="sm" tone="danger" className="mt-4 text-center">
            {error}
          </AppText>
        ) : null}
      </View>

      <View className="mt-auto">
        <NumericKeypad onKey={onKey} />
      </View>
    </View>
  );
}
