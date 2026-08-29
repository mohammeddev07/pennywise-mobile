import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/shared/ui/components/AppText";
import { CategoryIcon } from "@/shared/ui/components/CategoryIcon";
import { tokens } from "@/shared/ui/theme/tokens";
import { amountColor } from "@/shared/ui/theme/money";

type Tone = "income" | "expense" | "neutral" | "primary";

function toneColor(tone: Tone) {
  if (tone === "expense") return amountColor("EXPENSE");
  if (tone === "income") return amountColor("INCOME");
  // A count or a label is not money, so it stays in body text color.
  if (tone === "neutral") return tokens.semantic.text;
  return tokens.semantic.primary;
}

function toneIcon(tone: Tone): keyof typeof Ionicons.glyphMap {
  if (tone === "expense") return "arrow-up";
  if (tone === "neutral") return "wallet-outline";
  return "arrow-down";
}

export function SummaryStat({
  label,
  value,
  tone = "primary",
  icon,
  /**
   * `compact` drops the icon and stacks tighter, for rows of three or more.
   * It is a density of the same component, not a second component - screens
   * must not hand-roll a smaller stat block.
   */
  compact = false,
}: {
  label: string;
  value: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
  compact?: boolean;
}) {
  const color = toneColor(tone);

  if (compact) {
    return (
      <View
        style={{
          flex: 1,
          minHeight: 64,
          justifyContent: "center",
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          borderColor: tokens.colors.stroke,
          backgroundColor: tokens.colors.surface,
          paddingHorizontal: tokens.space[3],
          paddingVertical: tokens.space[3],
        }}
      >
        <AppText variant="xs" tone="muted" numberOfLines={1}>
          {label}
        </AppText>
        <AppText variant="sm" weight="bold" style={{ marginTop: 2, color }} numberOfLines={1}>
          {value}
        </AppText>
      </View>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        minHeight: 86,
        flexDirection: "row",
        alignItems: "center",
        borderRadius: tokens.radii.md,
        borderWidth: 1,
        borderColor: tokens.colors.stroke,
        backgroundColor: tokens.colors.surface,
        padding: tokens.space[4],
      }}
    >
      <CategoryIcon icon={icon ?? toneIcon(tone)} color={color} size={48} />
      <View style={{ marginLeft: 14, flex: 1 }}>
        <AppText variant="sm" tone="muted">
          {label}
        </AppText>
        <AppText variant="base" weight="bold" style={{ marginTop: 2, color }} numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

export default SummaryStat;
