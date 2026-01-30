import { useCallback } from "react";
import { BackHandler, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Button } from "@/shared/ui/components/Button";

export default function WelcomeScreen() {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        // We're at the root (no history). Exit instead of dispatching GO_BACK.
        BackHandler.exitApp();
        return true;
      });

      return () => sub.remove();
    }, [])
  );

  return (
    <View className="flex-1 bg-app px-6 pt-16 pb-10">
      {/* Brand */}
      <View className="mt-6">
        <Text className="text-text text-3xl font-semibold">PennyWise</Text>
        <Text className="text-muted mt-2 text-base leading-6">
          Track cashflow across books with a premium, data-forward experience.
        </Text>
      </View>

      {/* Illustration placeholder */}
      <View className="mt-10 flex-1 rounded-2xl border border-stroke bg-surface items-center justify-center">
        <Text className="text-muted">Illustration placeholder</Text>
      </View>

      {/* CTAs */}
      <View className="mt-8 gap-3">
        <Button label="Log in" onPress={() => router.push("/(auth)/login")} />
        <Button
          variant="ghost"
          label="Create account"
          onPress={() => router.push("/(auth)/signup")}
        />
        <Text className="text-muted text-xs text-center mt-2">
          By continuing you agree to our Terms & Privacy.
        </Text>
      </View>
    </View>
  );
}
