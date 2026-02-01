import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { tokens } from "@/shared/ui/theme/tokens";
import { NumericKeypad, type Key } from "@/shared/ui/NumericKeypad";
import { Button } from "@/shared/ui/components/Button";
import { PinDots } from "@/shared/ui/components/PinDots";

const DEMO_PIN = "1234";

export default function PinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const didNavigateRef = useRef(false);

  const handleBack = () => {
    Haptics.selectionAsync().catch(() => {});
    // Some entry paths have no history, so GO_BACK would be unhandled.
    const canGoBack =
      typeof (router as any).canGoBack === "function" ? (router as any).canGoBack() : false;

    if (canGoBack) router.back();
    else router.replace("/(auth)/welcome");
  };

  const onKey = (k: Key) => {
    setPin((prev) => {
      if (k === "back") return prev.slice(0, -1);
      if (k === ".") return prev; // ignore dot for PIN
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
        <Pressable
          onPress={handleBack}
          className="h-11 w-11 items-center justify-center rounded-full bg-surface border border-stroke"
          android_ripple={{ color: "#FFFFFF12", borderless: true }}
        >
          <Ionicons name="chevron-back" size={22} color={tokens.colors.text} />
        </Pressable>

        <View className="ml-4">
          <Text className="text-text text-xl font-semibold">Secure your account</Text>
          <Text className="text-muted mt-1">Enter your 4-digit PIN</Text>
        </View>
      </View>

      <View className="mt-14 items-center">
        <PinDots length={4} filled={pin.length} />
        <Text className="text-muted text-xs mt-4">Demo PIN: 1234</Text>

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
