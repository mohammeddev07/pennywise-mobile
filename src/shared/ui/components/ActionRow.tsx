import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/shared/ui/components/AppText";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";

type Props = {
  label: string;
  value?: string;
  subtitle?: string;
  icon?: keyof typeof Ionicons.glyphMap | string;
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
    <View style={{ minHeight: 72, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 }}>
      <CategoryIcon icon={icon} color={iconColor} size={48} />
      <View style={{ flex: 1, marginLeft: 14 }}>
        <AppText variant="base" style={{ fontFamily: "Inter_600SemiBold" }} numberOfLines={1}>
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
          <Ionicons name="chevron-forward" size={22} color={tokens.colors.muted} />
        </View>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <HapticPressable onPress={onPress} haptic="selection" pressScale={0.99} android_ripple={{ color: "#0B12200F" }}>
      {content}
    </HapticPressable>
  );
}

export default ActionRow;
