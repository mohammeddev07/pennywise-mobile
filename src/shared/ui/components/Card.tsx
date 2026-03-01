import React, { type PropsWithChildren } from "react";
import { View, type ViewProps } from "react-native";
import clsx from "clsx";

type Props = ViewProps &
  PropsWithChildren<{
    variant?: "card" | "surface";
    padding?: 16 | 24;
    className?: string;
  }>;

export function Card({
  variant = "card",
  padding = 16,
  className,
  children,
  ...rest
}: Props) {
  return (
    <View
      {...rest}
      className={clsx(
        "border border-stroke rounded-xl",
        variant === "card" ? "bg-card" : "bg-surface",
        padding === 24 ? "p-6" : "p-4", // 24 / 16
        className
      )}
    >
      {children}
    </View>
  );
}

export default Card;
