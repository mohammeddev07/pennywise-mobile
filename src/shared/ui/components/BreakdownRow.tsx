import React, { type ReactNode } from "react";
import { View } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { tokens } from "@/shared/ui/theme/tokens";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";

/**
 * A category's share of spending as a horizontal comparison bar.
 *
 * Bars beat a donut here: they compare directly, label without a legend, and
 * stay readable at five or fifteen categories.
 */
export function BreakdownRow({
  name,
  amount,
  share,
  color = tokens.colors.accent,
  icon,
  count,
  shareLabel = "of spending",
  selected = false,
  onPress,
  footer,
}: {
  name: string;
  /** Pre-formatted currency string. */
  amount: string;
  /** 0..1. `null` = no share to show (income, or a zero denominator): no bar, no percentage. */
  share: number | null;
  color?: string;
  icon?: string;
  /** Transactions behind the amount. */
  count?: number;
  shareLabel?: string;
  /** Marks the row currently plotted / drilled into. */
  selected?: boolean;
  onPress?: () => void;
  footer?: ReactNode;
}) {
  const raw = share === null ? null : share * 100;
  // A real but tiny share must not read as 0%, and a true 0 must not read as a sliver of spend.
  const pctText = raw === null ? null : raw > 0 && raw < 1 ? "<1%" : `${Math.round(raw)}%`;
  const detail = [pctText ? `${pctText} ${shareLabel}` : null, count === undefined ? null : `${count} ${count === 1 ? "transaction" : "transactions"}`]
    .filter(Boolean)
    .join(" · ");

  const body = (
    <View
      style={{
        paddingVertical: tokens.space[3],
        borderLeftWidth: 2,
        borderLeftColor: selected ? color : "transparent",
        paddingLeft: selected ? tokens.space[2] : 0,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {icon ? (
          <View style={{ marginRight: tokens.space[3] }}>
            <CategoryIcon icon={icon} color={color} size={30} />
          </View>
        ) : null}
        {/* Two lines: a long category name wraps instead of hiding behind an ellipsis. */}
        <AppText variant="base" weight="semibold" numberOfLines={2} style={{ flex: 1, minWidth: 0, paddingRight: tokens.space[3] }}>
          {name}
        </AppText>
        <View style={{ flexShrink: 0 }}>
          <MoneyAmount value={amount} tone="neutral" size="base" weight="bold" />
        </View>
      </View>

      {raw === null ? null : (
        <View
          style={{
            height: 6,
            marginTop: tokens.space[3],
            borderRadius: tokens.radii.pill,
            backgroundColor: tokens.colors.neutralSoft,
            overflow: "hidden",
          }}
        >
          {raw > 0 ? (
            <View
              style={{
                width: `${Math.max(2, Math.min(100, raw))}%`,
                height: 6,
                borderRadius: tokens.radii.pill,
                backgroundColor: color,
              }}
            />
          ) : null}
        </View>
      )}

      {detail ? (
        <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[2] }}>
          {detail}
        </AppText>
      ) : null}
      {footer}
    </View>
  );

  return onPress ? (
    <HapticPressable
      onPress={onPress}
      haptic="none"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${name}, ${amount}${detail ? `, ${detail}` : ""}`}
    >
      {body}
    </HapticPressable>
  ) : (
    body
  );
}

export default BreakdownRow;
