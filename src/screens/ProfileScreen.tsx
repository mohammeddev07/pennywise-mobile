import React from "react";
import { View, Text, Pressable } from "react-native";
import { Screen } from "../components/Screen";
import { useAppStore } from "../state/appStore";

export function ProfileScreen() {
  const themeMode = useAppStore((s) => s.themeMode);
  const setThemeMode = useAppStore((s) => s.setThemeMode);

  return (
    <Screen className="px-5 pt-10">
      <Text className="text-xl font-bold text-textLight dark:text-white">Profile / Settings</Text>

      <View className="mt-6 gap-3">
        <View className="rounded-2xl bg-white p-4 shadow-sm dark:bg-cardDark dark:border dark:border-gray-700/50">
          <Text className="text-sm font-semibold text-textLight dark:text-white">Book</Text>
          <Text className="mt-1 text-sm text-textMutedLight dark:text-textSecondary">Personal</Text>
        </View>

        <View className="rounded-2xl bg-white p-4 shadow-sm dark:bg-cardDark dark:border dark:border-gray-700/50">
          <Text className="text-sm font-semibold text-textLight dark:text-white">Currency</Text>
          <Text className="mt-1 text-sm text-textMutedLight dark:text-textSecondary">USD (locked)</Text>
        </View>

        <View className="rounded-2xl bg-white p-4 shadow-sm dark:bg-cardDark dark:border dark:border-gray-700/50">
          <Text className="text-sm font-semibold text-textLight dark:text-white">Theme</Text>

          <View className="mt-3 flex-row gap-10">
            {(["dark", "light", "system"] as const).map((m) => {
              const selected = themeMode === m;
              return (
                <Pressable key={m} onPress={() => setThemeMode(m)} className="flex-row items-center gap-2">
                  <View className={`h-5 w-5 rounded-full border ${selected ? "bg-primary dark:bg-primary border-transparent" : "border-gray-300 dark:border-gray-700"}`} />
                  <Text className="text-sm capitalize text-textLight dark:text-white">{m}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Screen>
  );
}
