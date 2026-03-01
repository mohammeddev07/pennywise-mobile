import { useCallback } from "react";
import { BackHandler, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { Button } from "@/shared/ui/components/Button";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";

export default function WelcomeScreen() {
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        BackHandler.exitApp();
        return true;
      });

      return () => sub.remove();
    }, [])
  );

  return (
    <View className="flex-1 bg-app px-6 pt-16 pb-10">
      <View className="mt-6">
        <AppText variant="2xl">PennyWise</AppText>
        <AppText variant="base" tone="muted" className="mt-2">
          Track cashflow across books with a consistent, fast budgeting workflow.
        </AppText>
      </View>

      <Card variant="surface" className="mt-10 flex-1 items-center justify-center">
        <AppText variant="sm" tone="muted">
          Onboarding illustration
        </AppText>
      </Card>

      <View className="mt-8 gap-3">
        <Button label="Log in" onPress={() => router.push("/(auth)/login")} />
        <Button variant="ghost" label="Create account" onPress={() => router.push("/(auth)/signup")} />
        <AppText variant="xs" tone="muted" className="mt-1 text-center">
          By continuing you agree to our Terms and Privacy Policy.
        </AppText>
      </View>
    </View>
  );
}
