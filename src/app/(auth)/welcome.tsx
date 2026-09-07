import { useCallback } from "react";
import { BackHandler, View } from "react-native";
import { router, useFocusEffect } from "expo-router";

import { Button } from "@/shared/ui/components/Button";
import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { CharacterWidget } from "@/shared/ui/components/CharacterWidget";
import { tokens } from "@/shared/ui/theme/tokens";
import { Icon } from "@/shared/ui/components/Icon";

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
    <View className="flex-1 bg-app px-5 pt-16 pb-10">
      <View className="mt-6">
        <AppText variant="2xl">PennyWise</AppText>
        <AppText variant="base" tone="muted" className="mt-2">
          Track income, expenses, and budgets in one simple cash book.
        </AppText>
      </View>

      <Card variant="surface" className="mt-10 flex-1 justify-center">
        <View className="items-center">
          <CharacterWidget state="happy" size={86} />
          <AppText variant="xl" className="mt-6 text-center">
            Your money, clear at a glance
          </AppText>
          <AppText variant="sm" tone="muted" className="mt-2 text-center">
            Log income and expenses quickly, then review budgets before spending gets away from you.
          </AppText>
        </View>

        <View className="mt-8 gap-3">
          {[
            ["add-circle-outline", "Add money in or out"],
            ["pricetags-outline", "Track categories and budgets"],
            ["bar-chart-outline", "Review monthly summaries"],
          ].map(([icon, label]) => (
            <View key={label} className="flex-row items-center rounded-lg border border-stroke bg-card px-4 py-3">
              <Icon name={icon as any} size={18} color={tokens.colors.accent} />
              <AppText variant="sm" className="ml-3">
                {label}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <View className="mt-8 gap-3">
        <Button label="Log in" onPress={() => router.push("/(auth)/login")} />
        <Button variant="secondary" label="Create account" onPress={() => router.push("/(auth)/signup")} />
      </View>
    </View>
  );
}
