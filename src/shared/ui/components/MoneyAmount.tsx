import React from "react";
import { View, type StyleProp, type TextStyle } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { numerals, tokens } from "@/shared/ui/theme/tokens";
import { amountColor } from "@/shared/ui/theme/money";
import type { MoneyKind } from "@/shared/ui/theme/money";

type Size = "display" | "amount" | "3xl" | "2xl" | "xl" | "lg" | "base" | "sm";

/**
 * Money sizes, in Sora.
 *
 * These deliberately do not reuse `tokens.typography` by name: that scale is
 * Schibsted Grotesk for words, and the system's core rule is that a currency
 * amount is always the numeral face. Sizes line up with the UI scale so an
 * amount and the label beside it still share a baseline.
 */
const SIZE: Record<Size, { fontSize: number; lineHeight: number; letterSpacing: number }> = {
  display: { fontSize: 62, lineHeight: 64, letterSpacing: -1 },
  amount: { fontSize: 44, lineHeight: 50, letterSpacing: -1.2 },
  "3xl": { fontSize: 30, lineHeight: 38, letterSpacing: -0.8 },
  "2xl": { fontSize: 26, lineHeight: 32, letterSpacing: -0.6 },
  xl: { fontSize: 20, lineHeight: 27, letterSpacing: -0.3 },
  lg: { fontSize: 17, lineHeight: 23, letterSpacing: -0.2 },
  base: { fontSize: 15, lineHeight: 21, letterSpacing: 0 },
  sm: { fontSize: 13, lineHeight: 19, letterSpacing: 0 },
};

/**
 * Every money figure in the app renders through this component.
 *
 * It owns three rules that must never drift apart across screens:
 *  - amounts are Sora with tabular figures, so a counting or edited value
 *    never reflows and never borrows the UI face;
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
  const metrics = SIZE[size];

  return (
    <AppText
      variant="amountSm"
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={size === "display" || size === "amount"}
      minimumFontScale={0.6}
      style={[
        metrics,
        {
          fontFamily: weight === "bold" ? numerals.bold : numerals.semibold,
          color: resolvedColor,
          fontVariant: ["tabular-nums"],
        },
        style,
      ]}
    >
      {sign}
      {value}
    </AppText>
  );
}

/**
 * A hero amount with the currency symbol split out.
 *
 * The system's one exception to "never mix faces in a text node": the "$" is
 * still Sora, but rendered at roughly half the size in the tertiary color so
 * the digits carry the whole weight of the figure.
 */
export function HeroAmount({
  /** Digits and separators only - no currency symbol. */
  value,
  symbol = "$",
  size = 62,
  color = tokens.colors.text,
  accessibilityLabel,
  style,
}: {
  value: string;
  symbol?: string;
  size?: number;
  color?: string;
  /**
   * States the settled figure. A counting value would otherwise be announced
   * mid-animation, so the label - not the visible text - is what assistive
   * technology reads.
   */
  accessibilityLabel?: string;
  style?: StyleProp<TextStyle>;
}) {
  // A negative figure reads "-$12.00", never "$-12.00": the sign is hoisted
  // ahead of the symbol and kept at full digit size so it cannot be missed.
  const negative = /^[-\u2212]/.test(value);
  const digits = negative ? value.replace(/^[-\u2212]/, "") : value;

  return (
    <View
      style={{ flexDirection: "row", alignItems: "flex-start" }}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      {negative ? (
        <AppText
          variant="amountSm"
          style={{
            fontFamily: numerals.bold,
            fontSize: size,
            lineHeight: Math.round(size * 1.04),
            color,
          }}
        >
          {"\u2212"}
        </AppText>
      ) : null}
      <AppText
        variant="amountSm"
        style={{
          fontFamily: numerals.bold,
          fontSize: Math.round(size * 0.5),
          lineHeight: Math.round(size * 0.62),
          color: tokens.colors.subtle,
          marginRight: tokens.space[1],
          marginTop: Math.round(size * 0.12),
        }}
      >
        {symbol}
      </AppText>
      <AppText
        variant="amountSm"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.5}
        style={[
          {
            fontFamily: numerals.bold,
            fontSize: size,
            lineHeight: Math.round(size * 1.04),
            letterSpacing: -1,
            color,
            fontVariant: ["tabular-nums"],
          },
          style,
        ]}
      >
        {digits}
      </AppText>
    </View>
  );
}

export default MoneyAmount;
