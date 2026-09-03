import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AppText } from "@/shared/ui/components/AppText";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { tokens } from "@/shared/ui/theme/tokens";

type Tone = "income" | "expense" | "neutral";

/**
 * A compact figure + label, used instead of a card wherever two or three
 * numbers sit side by side (Home's income/spent, Activity's totals).
 *
 * Deliberately borderless: these are statistics, not objects, and giving each
 * one a card was most of what made the old dashboard feel busy.
 */
export function StatBlock({
  label,
  value,
  tone = "neutral",
  align = "left",
}: {
  label: string;
  /** Pre-formatted currency string, or any short value for `neutral`. */
  value: string;
  tone?: Tone;
  align?: "left" | "center";
}) {
  const kind = tone === "income" ? ("INCOME" as const) : tone === "expense" ? ("EXPENSE" as const) : undefined;

  return (
    <View style={{ flex: 1, alignItems: align === "center" ? "center" : "flex-start" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: tokens.space[1] }}>
        {kind ? (
          <Ionicons
            name={tone === "income" ? "arrow-down" : "arrow-up"}
            size={13}
            color={tone === "income" ? tokens.semantic.income : tokens.semantic.expense}
          />
        ) : null}
        <AppText variant="xs" tone="muted" numberOfLines={1}>
          {label.toUpperCase()}
        </AppText>
      </View>

      {kind ? (
        <MoneyAmount value={value} kind={kind} size="lg" style={{ marginTop: tokens.space[1] }} />
      ) : (
        <AppText
          variant="lg"
          weight="bold"
          numberOfLines={1}
          style={{ marginTop: tokens.space[1], fontVariant: ["tabular-nums"] }}
        >
          {value}
        </AppText>
      )}
    </View>
  );
}

export default StatBlock;
