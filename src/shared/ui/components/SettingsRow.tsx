import React, { type ReactNode } from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/shared/ui/components/AppText";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";

type Props = {
  label: string;
  value?: string;
  /** Renders a lock instead of a chevron and makes the row non-interactive. */
  locked?: boolean;
  onPress?: () => void;
  tone?: "default" | "danger";
  icon?: keyof typeof Ionicons.glyphMap;
  right?: ReactNode;
};

/**
 * One row shape for every settings list: the name reads first, the current
 * value sits under it, a chevron marks a row that navigates and a lock marks
 * one whose value is fixed. A locked row is rendered, not hidden - the value
 * still matters even though it cannot change.
 */
export function SettingsRow({ label, value, locked, onPress, tone = "default", icon, right }: Props) {
  const color = tone === "danger" ? tokens.colors.danger : tokens.colors.text;

  const content = (
    <View
      style={{
        minHeight: 60,
        paddingHorizontal: tokens.space[4],
        paddingVertical: tokens.space[3],
        flexDirection: "row",
        alignItems: "center",
      }}
    >
      {icon ? (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: tokens.radii.sm,
            alignItems: "center",
            justifyContent: "center",
            marginRight: tokens.space[3],
            backgroundColor: tone === "danger" ? tokens.colors.redSoft : tokens.colors.neutralSoft,
          }}
        >
          <Ionicons name={icon} size={17} color={tone === "danger" ? tokens.colors.danger : tokens.colors.muted} />
        </View>
      ) : null}

      <View style={{ flex: 1, paddingRight: tokens.space[3] }}>
        <AppText variant="base" weight="semibold" numberOfLines={1} style={{ color }}>
          {label}
        </AppText>
        {value ? (
          <AppText variant="sm" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
            {value}
          </AppText>
        ) : null}
      </View>

      {right ??
        (locked ? (
          <Ionicons name="lock-closed" size={16} color={tokens.colors.subtle} />
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={18} color={tokens.colors.muted} />
        ) : null)}
    </View>
  );

  if (!onPress || locked) return content;

  return (
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.995}
      android_ripple={{ color: tokens.colors.ripple }}
    >
      {content}
    </HapticPressable>
  );
}

export default SettingsRow;
