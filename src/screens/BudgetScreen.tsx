import React from "react";
import { Text, View } from "react-native";
import { Screen } from "../components/Screen";

export function BudgetScreen() {
  return (
    <Screen className="items-center justify-center">
      <View className="rounded-2xl bg-white p-6 shadow-sm dark:bg-cardDark dark:border dark:border-gray-700/50">
        <Text className="text-base font-bold text-textLight dark:text-white">Budget</Text>
        <Text className="mt-2 text-sm text-textMutedLight dark:text-textSecondary">
          Placeholder screen scaffold. (Phase 3)
        </Text>
      </View>
    </Screen>
  );
}
