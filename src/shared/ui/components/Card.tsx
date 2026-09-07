import React, { type PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import { tokens } from "@/shared/ui/theme/tokens";

type Props = ViewProps &
  PropsWithChildren<{
    /** `surface` and `card` are the same step; `soft` is one step brighter. */
    variant?: "card" | "surface" | "soft";
    padding?: 0 | 12 | 16 | 20 | 24;
    /** Drop the hairline when the card is already separated by whitespace. */
    bordered?: boolean;
    className?: string;
  }>;

export function Card({
  variant = "card",
  padding = tokens.layout.cardPadding,
  bordered = true,
  className,
  children,
  style,
  ...rest
}: Props) {
  return (
    <View
      {...rest}
      className={className}
      style={[
        {
          borderRadius: tokens.radii.lg,
          backgroundColor:
            variant === "soft" ? tokens.colors.surfaceAlt : tokens.colors.surface,
          borderWidth: bordered ? 1 : 0,
          borderColor: tokens.colors.stroke,
          padding,
        },
        // The 1px top-edge highlight is what lifts a surface off the layer
        // beneath it. It replaces the drop shadow the system does not use.
        bordered ? { borderTopColor: tokens.colors.edgeHighlight } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export default Card;
