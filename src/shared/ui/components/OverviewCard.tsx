import React from "react";
import { View, Text } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

type Props = {
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgClass: string; // e.g. "bg-orange-100 dark:bg-orange-900/30"
  iconColor: string;   // runtime icon tint
  label: string;
  value: string;
  trendText: string;
  trendUp?: boolean;
};

export function OverviewCard({ icon, iconBgClass, iconColor, label, value, trendText, trendUp = true }: Props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className={`min-w-[140px] rounded-2xl p-4 shadow-sm ${isDark ? "bg-cardDark border border-gray-700/50" : "bg-white border border-gray-100"}`}>
      <View className={`mb-3 h-10 w-10 items-center justify-center rounded-full ${iconBgClass}`}>
        <MaterialIcons name={icon} size={20} color={iconColor} />
      </View>

      <Text className={`text-xs font-medium ${isDark ? "text-textSecondary" : "text-gray-500"}`}>{label}</Text>
      <Text className={`mt-1 text-lg font-bold ${isDark ? "text-white" : "text-textLight"}`}>{value}</Text>

      <View className="mt-1 flex-row items-center">
        <MaterialIcons name={trendUp ? "arrow-upward" : "arrow-downward"} size={12} color={trendUp ? (isDark ? "#34d399" : "#16a34a") : (isDark ? "#34d399" : "#16a34a")} />
        <Text className={`ml-0.5 text-xs font-medium ${isDark ? "text-emerald-400" : "text-green-600"}`}>{trendText}</Text>
      </View>
    </View>
  );
}
