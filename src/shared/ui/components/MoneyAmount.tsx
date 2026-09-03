import React from "react";
import type { StyleProp, TextStyle } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { tokens, type TextVariant } from "@/shared/ui/theme/tokens";
import { amountColor } from "@/shared/ui/theme/money";
import type { MoneyKind } from "@/shared/ui/theme/money";

type Size = "display" | "amount" | "3xl" | "2xl" | "xl" | "lg" | "base" | "sm";

/**
 * Every money figure in the app renders through this component.
 *
 * It owns two rules that must never drift apart across screens:
 *  - income is green, expense is red, and a neutral net/balance is body text;
 *  - the sign is always printed, so the value is still readable without color.
 */
export function MoneyAmount({
  /** Pre-formatted currency string, e.g. "$126.00". Sign is added here. */
  value,
  kind,
  /** `neutral` prints no sign and uses body text color (balances, totals). */
  tone = "semantic",
  size = "base",
  weight = "bold",
  color,
  numberOfLines = 1,
  style,
}: {
  value: string;
  kind?: MoneyKind;
  tone?: "semantic" | "neutral";
  size?: Size;
  weight?: "semibold" | "bold";
  /** Explicit override, e.g. a balance that turns red only when negative. */
  color?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}) {
  const semantic = tone === "semantic" && kind;
  const isIncome = kind === "INCOME" || kind === "income";

  const resolvedColor = color ?? (semantic ? amountColor(kind) : tokens.colors.text);
  const sign = semantic ? (isIncome ? "+" : "−") : "";

  return (
    <AppText
      variant={size as TextVariant}
      weight={weight}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={size === "display" || size === "amount"}
      minimumFontScale={0.6}
      style={[{ color: resolvedColor, fontVariant: ["tabular-nums"] }, style]}
    >
      {sign}
      {value}
    </AppText>
  );
}

export default MoneyAmount;
