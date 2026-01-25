import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useColorScheme } from "nativewind";
import { MaterialIcons } from "@expo/vector-icons";
import { Sparkline } from "./Sparkline";

type Props = {
  balanceLabel: string;
  balanceText: string;
  deltaText: string;
  deltaCaption: string;
};

export function BalanceCard({ balanceLabel, balanceText, deltaText, deltaCaption }: Props) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  const colors = isDark
  ? (["#10b981", "#047857"] as const)
  : (["#2b4bee", "#5b2bee"] as const);


  return (
    <View className="px-5 py-2">
      {/* Tailwind for radius/overflow on wrapper */}
      <View className="overflow-hidden rounded-[24px]">
          <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.gradient}>

          {/* Decorative blobs */}
          <View className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          <View className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-white/10" />

          <View className="gap-6">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-medium text-white/90">{balanceLabel}</Text>
              <Pressable className="h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <MaterialIcons name="visibility" size={18} color="#fff" />
              </Pressable>
            </View>

            <View className="gap-1">
              <Text className="text-3xl font-bold tracking-tight text-white">{balanceText}</Text>
              <View className="flex-row items-center gap-2">
                <View className="flex-row items-center rounded-full bg-white/20 px-2 py-0.5">
                  <MaterialIcons
                    name="trending-up"
                    size={14}
                    color="#fff"
                    style={{ marginRight: 4 }}
                  />
                  <Text className="text-xs font-semibold text-white">{deltaText}</Text>
                </View>
                <Text className="text-xs text-white/80">{deltaCaption}</Text>
              </View>
            </View>

            <View className="h-16 w-full pt-4">
              <Sparkline />
            </View>
          </View>
        </LinearGradient>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    padding: 24,
    borderRadius: 24
  }
});
