import React, { useEffect, type PropsWithChildren, type ReactNode } from "react";
import { Platform, View, type ViewProps } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import clsx from "clsx";

import { AppText } from "@/shared/ui/components/AppText";
import { tokens } from "@/shared/ui/theme/tokens";
import { Container, useScreenPaddingX } from "@/shared/ui/components/Screen";

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
  const paddingX = useScreenPaddingX();

  // Web: Escape closes the route, like Android back. A bottom sheet or picker open on top handles its
  // own Escape (RN Modal marks the event), so a second press never pops two layers at once.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || e.defaultPrevented) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (router.canGoBack()) router.back();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <View
      {...rest}
      className={clsx(
        "w-full rounded-t-2xl border border-stroke",
        "bg-app",
        className
      )}
      style={[
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 16,
        },
        style,
      ]}
    >
      {/* Route-level sheets hold forms and detail views: one readable 520 column on tablet/web. */}
      <Container width="form" style={{ flex: 1, paddingHorizontal: paddingX }}>
      {(title || leftAction || rightAction) && (
        <View className="flex-row items-center mb-4">
          <View className="min-w-12 h-12 items-center justify-center">{leftAction}</View>

          <View className="flex-1 px-2">
            {title ? (
              <AppText variant="lg" accessibilityRole="header">
                {title}
              </AppText>
            ) : null}
          </View>

          <View className="min-w-12 h-12 items-center justify-end flex-row gap-2">{rightAction}</View>
        </View>
      )}

      <View className="flex-1">{children}</View>

      {footer
        ? footerVariant === "fullBleed"
          ? (
            <View
              style={{
                marginLeft: -paddingX,
                marginRight: -paddingX,
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
      </Container>
    </View>
  );
}

export default Sheet;
