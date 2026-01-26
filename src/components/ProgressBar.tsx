import React from "react";
import { View } from "react-native";

export function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-black/5 dark:bg-white/10">
      <View className="h-2 rounded-full bg-primary dark:bg-primary" style={{ width: `${clamped * 100}%` }} />
    </View>
  );
}
