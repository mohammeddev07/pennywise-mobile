import React from "react";
import { View } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { MoneyAmount } from "@/shared/ui/components/MoneyAmount";
import { tokens } from "@/shared/ui/theme/tokens";

type Tone = "income" | "expense" | "neutral";

/**
 * A compact figure + label, used instead of a card wherever two or three
 * numbers sit side by side (Home's income/spent, Activity's totals).
 *
 * Deliberately borderless and sparkline-free: these are statistics, not
 * objects, and giving each one a card with its own mini chart was most of what
 * made the old dashboard feel busy. The amount leads and the word follows
 * it - "+$271.00 Income" - so the figure is what the eye lands on and the
 * sign carries the direction without depending on the color.
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
      <View style={{ flexDirection: "row", alignItems: "baseline", gap: tokens.space[2] }}>
        {kind ? (
          <MoneyAmount value={value} kind={kind} size="lg" />
        ) : (
          <AppText variant="lg" weight="bold" numberOfLines={1} style={{ fontVariant: ["tabular-nums"] }}>
            {value}
          </AppText>
        )}

        <AppText variant="sm" tone="muted" numberOfLines={1}>
          {label}
        </AppText>
      </View>
    </View>
  );
}

export default StatBlock;
