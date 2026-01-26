import React from "react";
import { View, Text, Pressable } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import type { Transaction } from "../types/dto";

type Props = {
  tx: Transaction;
  subtitle: string;
  amountText: string;
  onPress?: () => void;
};

function iconFor(tx: Transaction): { icon: keyof typeof MaterialIcons.glyphMap; bg: string; color: string; border?: string } {
  const name = (tx.merchantName ?? "").toLowerCase();
  if (name.includes("whole foods") || tx.category.id === "c_groc") return { icon: "shopping-cart", bg: "bg-yellow-900/20", border: "border border-yellow-700/30", color: "#facc15" };
  if (name.includes("salary") || tx.type === "INCOME") return { icon: "attach-money", bg: "bg-emerald-900/20", border: "border border-emerald-700/30", color: "#34d399" };
  if (name.includes("uber") || tx.category.id === "c_fuel") return { icon: "local-taxi", bg: "bg-blue-900/20", border: "border border-blue-700/30", color: "#60a5fa" };
  if (name.includes("netflix") || tx.category.id === "c_fun") return { icon: "movie", bg: "bg-pink-900/20", border: "border border-pink-700/30", color: "#f472b6" };
  return { icon: "receipt-long", bg: "bg-slate-900/10", border: "border border-slate-700/30", color: "#94a3b8" };
}

export function TransactionRow({ tx, subtitle, amountText, onPress }: Props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";
  const icon = iconFor(tx);

  const cardClass = isDark
    ? "bg-cardDark border border-gray-700/50"
    : "bg-white border border-transparent";

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center justify-between rounded-xl p-4 shadow-sm ${cardClass}`}
      android_ripple={{ color: isDark ? "#ffffff10" : "#00000008" }}
    >
      <View className="flex-row items-center gap-4">
        <View className={`h-12 w-12 items-center justify-center rounded-full ${icon.bg} ${icon.border ?? ""}`}>
          <MaterialIcons name={icon.icon} size={24} color={icon.color} />
        </View>

        <View className="flex-col">
          <Text numberOfLines={1} className={`text-base font-semibold ${isDark ? "text-white" : "text-textLight"}`}>
            {tx.merchantName ?? "Transaction"}
          </Text>
          <Text className={`text-xs ${isDark ? "text-textSecondary" : "text-textMutedLight"}`}>{subtitle}</Text>
        </View>
      </View>

      <Text className={`text-base font-bold ${isDark ? "text-white" : "text-textLight"}`}>{amountText}</Text>
    </Pressable>
  );
}
