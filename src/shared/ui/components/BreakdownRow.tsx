import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/shared/ui/components/AppText";
import { tokens } from "@/shared/ui/theme/tokens";

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
}: {
  name: string;
  /** Pre-formatted currency string. */
  amount: string;
  /** 0..1 */
  share: number;
  color?: string;
  icon?: string;
}) {
  const pct = Math.round(share * 100);

  return (
    <View style={{ paddingVertical: tokens.space[3] }}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        {icon ? (
          <Ionicons name={icon as any} size={16} color={color} style={{ marginRight: tokens.space[2] }} />
        ) : null}
        <AppText variant="base" weight="semibold" numberOfLines={1} style={{ flex: 1 }}>
          {name}
        </AppText>
        <AppText
          variant="base"
          weight="semibold"
          numberOfLines={1}
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {amount}
        </AppText>
      </View>

      <View
        style={{
          height: 6,
          marginTop: tokens.space[3],
          borderRadius: tokens.radii.pill,
          backgroundColor: tokens.colors.neutralSoft,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: `${Math.max(2, pct)}%`,
            height: 6,
            borderRadius: tokens.radii.pill,
            backgroundColor: color,
          }}
        />
      </View>

      <AppText variant="sm" tone="muted" style={{ marginTop: tokens.space[2] }}>
        {pct}% of spending
      </AppText>
    </View>
  );
}

export default BreakdownRow;
