import React from "react";
import { Text, type TextProps, type TextStyle } from "react-native";
import clsx from "clsx";

import { tokens, type TextTone, type TextVariant } from "@/shared/ui/theme/tokens";

type Props = TextProps & {
  variant?: TextVariant;
  tone?: TextTone;
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
  className,
  style,
  ...rest
}: Props) {
  const v = tokens.typography[variant] as TextStyle;

  return (
    <Text
      {...rest}
      className={clsx(toneClass[tone], className)}
      style={[v, style]}
      // This reduces Android font padding inconsistency.
      // @ts-expect-error RN supports this on Android.
      includeFontPadding={false}
    />
  );
}

export default AppText;
