import React from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import clsx from "clsx";

import { fonts, tokens, type TextTone, type TextVariant } from "@/shared/ui/theme/tokens";

export type TextWeight = keyof typeof fonts;

type Props = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
  /**
   * Overrides the weight baked into `variant`. Android ignores `fontWeight`
   * once a named family is set, so weight has to be swapped at the family
   * level - this prop exists so screens never hardcode "Inter_600SemiBold".
   */
  weight?: TextWeight;
  className?: string;
};

const toneClass: Record<TextTone, string> = {
  default: "text-text",
  muted: "text-muted",
  danger: "text-danger",
  success: "text-accent",
  warning: "text-warning",
};

export function AppText({
  variant = "base",
  tone = "default",
  weight,
  className,
  style,
  ...rest
}: Props) {
  const v = tokens.typography[variant] as TextStyle;

  return (
    <Text
      {...rest}
      className={clsx(toneClass[tone], className)}
      style={[v, weight ? { fontFamily: fonts[weight] } : null, style]}
      // This reduces Android font padding inconsistency.
      // @ts-expect-error RN supports this on Android.
      includeFontPadding={false}
    />
  );
}

export default AppText;
