import React, { type PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import clsx from "clsx";
import { tokens } from "@/shared/ui/theme/tokens";

type Props = ViewProps &
  PropsWithChildren<{
    variant?: "card" | "surface" | "soft";
    padding?: 0 | 16 | 24;
    elevated?: boolean;
    className?: string;
  }>;

export function Card({
  variant = "card",
  padding = 16,
  elevated = true,
  className,
  children,
  style,
  ...rest
}: Props) {
  return (
    <View
      {...rest}
      className={clsx(
        "border border-stroke rounded-xl",
        variant === "soft" ? "bg-surfaceAlt" : variant === "card" ? "bg-card" : "bg-surface",
        padding === 0 ? "" : padding === 24 ? "p-6" : "p-4", // 24 / 16
        className
      )}
      style={[elevated ? tokens.elevation.card.ios : null, style]}
    >
      {children}
    </View>
  );
}

export default Card;
