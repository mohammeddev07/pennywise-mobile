import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

export function TipCard({ title, body, onClose }: { title: string; body: string; onClose?: () => void }) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className={`rounded-2xl p-4 ${isDark ? "bg-cardDark border border-gray-700/50" : "bg-white shadow-sm"}`}>
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-start gap-3">
          <View className={`h-10 w-10 items-center justify-center rounded-full ${isDark ? "bg-emerald-900/30" : "bg-blue-50"}`}>
            <MaterialIcons name="tips-and-updates" size={20} color={isDark ? "#34d399" : "#2b4bee"} />
          </View>

          <View className="flex-1">
            <Text className={`text-sm font-bold ${isDark ? "text-white" : "text-textLight"}`}>{title}</Text>
            <Text className={`mt-1 text-xs ${isDark ? "text-textSecondary" : "text-textMutedLight"}`}>{body}</Text>
          </View>
        </View>

        {onClose ? (
          <Pressable onPress={onClose} className="h-8 w-8 items-center justify-center rounded-full bg-black/5 dark:bg-white/10">
            <MaterialIcons name="close" size={18} color={isDark ? "#cbd5e1" : "#64748b"} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
