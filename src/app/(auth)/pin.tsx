import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { Button } from "@/shared/ui/components/Button";
import { PinDots } from "@/shared/ui/components/PinDots";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";

const DEMO_PIN = "1234";

export default function PinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const didNavigateRef = useRef(false);

  const handleBack = () => {
    const canGoBack = typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;

    if (canGoBack) router.back();
    else router.replace("/(auth)/welcome");
  };

  const onKey = (k: Key) => {
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.replace("/(onboarding)/books");
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    const t = setTimeout(() => setPin(""), 250);
    return () => clearTimeout(t);
  }, [pin, router]);

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
          Demo PIN: 1234
        </AppText>

        <View className="mt-6 w-full">
          <Button
            variant="ghost"
            size="md"
            label="Use biometrics (coming next step)"
            onPress={() => Haptics.selectionAsync().catch(() => {})}
          />
        </View>
      </View>

      <View className="mt-auto">
        <NumericKeypad onKey={onKey} />
      </View>
    </View>
  );
}
