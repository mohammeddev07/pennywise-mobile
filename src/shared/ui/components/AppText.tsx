import React from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import clsx from "clsx";

import { fonts, numerals, tokens, type TextTone, type TextVariant } from "@/shared/ui/theme/tokens";

export type TextWeight = keyof typeof fonts;

type Props = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /**
   * Overrides the weight baked into `variant`. Android ignores `fontWeight`
   * once a named family is set, so weight has to be swapped at the family
   * level - this prop exists so screens never hardcode a family string.
   *
   * On a money variant the weight swaps within Sora, so the numeral face is
   * never accidentally traded for the UI face.
   */
  weight?: TextWeight;
  className?: string;
};

const toneClass: Record<TextTone, string> = {
  default: "text-text",
  muted: "text-muted",
  subtle: "text-subtle",
  danger: "text-danger",
  success: "text-income",
  warning: "text-warning",
};

/**
 * Variants that render a currency amount. These are Sora with tabular
 * figures; everything else is Schibsted Grotesk. The split is the system's
 * core type rule: numbers get the display face, words get the UI face.
 */
const MONEY_VARIANTS = new Set<TextVariant>(["amountSm", "amount", "display", "displayLg"]);

export function isMoneyVariant(variant: TextVariant) {
  return MONEY_VARIANTS.has(variant);
}

export function AppText({
  variant = "base",
  tone = "default",
  weight,
  className,
  style,
  ...rest
}: Props) {
  const v = tokens.typography[variant] as TextStyle;
  const family = MONEY_VARIANTS.has(variant) ? numerals : fonts;

  return (
    <Text
      {...rest}
      className={clsx(toneClass[tone], className)}
      style={[v, weight ? { fontFamily: family[weight] } : null, style]}
      // This reduces Android font padding inconsistency.
      // @ts-expect-error RN supports this on Android.
      includeFontPadding={false}
    />
  );
}

export default AppText;
