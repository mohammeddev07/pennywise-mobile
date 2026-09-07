import React, { type ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";
import { Icon, type IconName } from "./Icon";

type Props = {
  label: string;
  value?: string;
  /** Renders a lock instead of a chevron and makes the row non-interactive. */
  locked?: boolean;
  onPress?: () => void;
  tone?: "default" | "danger";
  icon?: IconName;
  right?: ReactNode;
  /**
   * Renders `value` as a currency figure - Sora with tabular figures - rather
   * than as body text. A settings row holding an amount is still an amount.
   */
  valueIsMoney?: boolean;
};

/**
 * One row shape for every settings list: the name reads first, the current
 * value sits under it, a chevron marks a row that navigates and a lock marks
 * one whose value is fixed. A locked row is rendered, not hidden - the value
 * still matters even though it cannot change.
 */
export function SettingsRow({
  label,
  value,
  locked,
  onPress,
  tone = "default",
  icon,
  right,
  valueIsMoney,
}: Props) {
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
          <Icon name={icon} size={17} color={tone === "danger" ? tokens.colors.danger : tokens.colors.muted} />
        </View>
      ) : null}

      <View style={{ flex: 1, paddingRight: tokens.space[3] }}>
        <AppText variant="base" weight="semibold" numberOfLines={1} style={{ color }}>
          {label}
        </AppText>
        {value ? (
          valueIsMoney ? (
            <MoneyAmount
              value={value}
              tone="neutral"
              size="sm"
              weight="semibold"
              color={tokens.colors.muted}
              style={{ marginTop: 2 }}
            />
          ) : (
            <AppText variant="sm" tone="muted" numberOfLines={1} style={{ marginTop: 2 }}>
              {value}
            </AppText>
          )
        ) : null}
      </View>

      {right ??
        (locked ? (
          <Icon name="lock-closed" size={tokens.icon.chip} color={tokens.colors.subtle} />
        ) : onPress ? (
          <Icon name="chevron-forward" size={tokens.icon.row} color={tokens.colors.muted} />
        ) : null)}
    </View>
  );

  if (!onPress || locked) return content;

  return (
    <HapticPressable
      onPress={onPress}
      // A chevron row navigates - explicitly silent.
      haptic="none"
      pressScale={0.995}
      android_ripple={{ color: tokens.colors.ripple }}
    >
      {content}
    </HapticPressable>
  );
}

export default SettingsRow;
