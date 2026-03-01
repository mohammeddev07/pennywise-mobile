import React, { type PropsWithChildren, type ReactNode } from "react";
import { View, type ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import clsx from "clsx";

import { AppText } from "@/shared/ui/components/AppText";

type Props = ViewProps &
  PropsWithChildren<{
    title?: string;
    leftAction?: ReactNode;
    rightAction?: ReactNode;
    footer?: ReactNode;
    footerVariant?: "default" | "fullBleed";
    tone?: "app" | "ink";
    className?: string;
  }>;

export function Sheet({
  title,
  leftAction,
  rightAction,
  footer,
  footerVariant = "default",
  tone = "app",
  className,
  children,
  style,
  ...rest
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View
      {...rest}
      className={clsx(
        "w-full rounded-t-[32px] border border-stroke",
        tone === "ink" ? "bg-ink" : "bg-app",
        className
      )}
      style={[
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 16,
          paddingLeft: 24,
          paddingRight: 24,
        },
        style,
      ]}
    >
      {(title || leftAction || rightAction) && (
        <View className="flex-row items-center mb-4">
          <View className="w-12 h-12 items-center justify-center">{leftAction}</View>

          <View className="flex-1 px-2">
            {title ? <AppText variant="lg">{title}</AppText> : null}
          </View>

          <View className="w-12 h-12 items-center justify-center">{rightAction}</View>
        </View>
      )}

      <View className="flex-1">{children}</View>

      {footer
        ? footerVariant === "fullBleed"
          ? (
            <View
              style={{
                marginLeft: -24,
                marginRight: -24,
                marginBottom: -(insets.bottom + 16),
                marginTop: 16,
              }}
            >
              {footer}
            </View>
            )
          : (
            <View className="mt-4 pt-4 border-t border-stroke">{footer}</View>
            )
        : null}
    </View>
  );
}

export default Sheet;
