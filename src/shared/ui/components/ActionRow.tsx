import React from "react";
import { View } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";
import { Icon, type IconName } from "./Icon";

type Props = {
  label: string;
  value?: string;
  subtitle?: string;
  icon?: IconName | string;
  iconColor?: string;
  onPress?: () => void;
  muted?: boolean;
  showChevron?: boolean;
};

export function ActionRow({
  label,
  value,
  subtitle,
  icon = "ellipse-outline",
  iconColor = tokens.colors.accent,
  onPress,
  muted,
  showChevron = !!onPress,
}: Props) {
  const content = (
    <View style={{ minHeight: 72, flexDirection: "row", alignItems: "center", paddingHorizontal: tokens.space[4], paddingVertical: tokens.space[3] }}>
      <CategoryIcon icon={icon} color={iconColor} size={40} rounded="lg" />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <AppText variant="base" weight="semibold" numberOfLines={1}>
          {label}
        </AppText>
        {value || subtitle ? (
          <AppText
            variant="sm"
            tone="muted"
            style={{ marginTop: 2, color: muted ? tokens.colors.muted : tokens.colors.muted }}
            numberOfLines={1}
          >
            {value ?? subtitle}
          </AppText>
        ) : null}
      </View>
      {showChevron ? (
        <View style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
          <Icon name="chevron-forward" size={18} color={tokens.colors.muted} />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <HapticPressable onPress={onPress} haptic="none" pressScale={0.99} android_ripple={{ color: tokens.colors.ripple }}>
      {content}
    </HapticPressable>
  );
}

export default ActionRow;
