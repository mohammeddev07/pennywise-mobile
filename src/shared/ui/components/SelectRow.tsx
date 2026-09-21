import React from "react";
import { View } from "react-native";

import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";
import { tokens } from "@/shared/ui/theme/tokens";
import { Icon } from "./Icon";

type Props = {
  label: string;
  value?: string;
  placeholder?: string;
  onPress: () => void;
  disabled?: boolean;
};

export function SelectRow({
  label,
  value,
  placeholder = "Select…",
  onPress,
  disabled,
}: Props) {
  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      haptic="none"
      pressScale={0.99}
      // Contract: full width, 56 high, 16 of side padding, the 22 field radius.
      // `disabled` is not faded here - HapticPressable already applies its own
      // disabled opacity, and fading twice made the label unreadable.
      style={{
        width: "100%",
        height: tokens.layout.controlHeight,
        paddingHorizontal: tokens.space[4],
        borderRadius: tokens.radii.md,
        borderWidth: 1,
        borderColor: tokens.colors.stroke,
        backgroundColor: tokens.colors.surface,
        flexDirection: "row",
        alignItems: "center",
      }}
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
        <Icon name="chevron-forward" size={18} color={tokens.colors.muted} />
      </View>
    </HapticPressable>
  );
}

export default SelectRow;
