import React from "react";
import { View } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { Card } from "@/shared/ui/components/Card";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { tokens } from "@/shared/ui/theme/tokens";
import { type IconName } from "./Icon";

export function MetricCard({
  label,
  value,
  change,
  icon = "wallet-outline",
  color = tokens.colors.accent,
}: {
  label: string;
  value: string;
  change?: string;
  icon?: IconName | string;
  color?: string;
}) {
  return (
    <Card variant="surface">
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <CategoryIcon icon={icon} color={color} size={44} rounded="lg" />
        <View style={{ flex: 1, marginLeft: 16 }}>
          <AppText variant="sm" tone="muted">
            {label}
          </AppText>
          <AppText variant="xl" weight="bold" style={{ marginTop: 4 }} numberOfLines={1}>
            {value}
          </AppText>
          {change ? (
            <AppText variant="sm" style={{ marginTop: 6, color: tokens.colors.accent }}>
              {change}
            </AppText>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

export default MetricCard;
