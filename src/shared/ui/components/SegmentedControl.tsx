import React from "react";
import { View, Text, Pressable } from "react-native";
import { useColorScheme } from "nativewind";

type Option<T extends string> = { label: string; value: T };

type Props<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
};

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <View className={`flex-row rounded-full p-1 ${isDark ? "bg-cardDark border border-gray-700/50" : "bg-white shadow-sm"}`}>
      {options.map((opt) => {
        const selected = opt.value === value;
        const selectedBg = isDark ? "bg-primary" : "bg-primaryLight";
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 items-center justify-center rounded-full py-2 ${selected ? selectedBg : ""}`}
          >
            <Text className={`text-xs font-semibold ${selected ? "text-white" : isDark ? "text-textSecondary" : "text-gray-500"}`}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
