import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import clsx from "clsx";

import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { tokens } from "@/shared/ui/theme/tokens";

type Props = {
  label: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
  className?: string;
};

export function SelectRow({
  label,
  value,
  placeholder = "Select…",
  onPress,
  disabled,
  className,
}: Props) {
  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      pressScale={0.99}
      className={clsx(
        // Contract:
        // - height: 56 => h-14
        // - paddingX: 16 => px-4
        // - radius: 16 => rounded-lg
        "w-full h-14 px-4 rounded-lg border border-stroke bg-surface flex-row items-center",
        disabled ? "opacity-40" : "",
        className
      )}
    >
      <View className="flex-1">
        <AppText variant="sm" tone="muted">
          {label}
        </AppText>

        <AppText variant="base" className="mt-0.5">
          {value?.length ? value : placeholder}
        </AppText>
      </View>

      {/* Chevron target: 48x48 */}
      <View className="w-12 h-12 items-center justify-center">
        <Ionicons name="chevron-forward" size={18} color={tokens.colors.muted} />
      </View>
    </HapticPressable>
  );
}

export default SelectRow;
