import React, { useState, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import clsx from "clsx";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";

type Variant = "primary" | "ghost" | "danger";
type Size = "lg" | "md";

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  className = "",
  disabled,
  loading,
  leftIcon,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
}) {
  const [pressed, setPressed] = useState(false);

  const isDisabled = !!disabled || !!loading;

  // Contract sizes: md=48, lg=56
  const h = size === "lg" ? "h-14" : "h-12";

  // Contract radius: 16px => rounded-lg (per tailwind.config.js)
  const base = clsx(
    "w-full flex-row items-center justify-center px-4 rounded-lg",
    h,
    isDisabled ? "opacity-40" : "",
    className
  );

  const bg =
    variant === "primary"
      ? pressed
        ? "bg-accentPressed"
        : "bg-accent"
      : variant === "danger"
      ? "bg-danger"
      : "bg-transparent border border-stroke";

  const textClass =
    variant === "primary" ? "text-black" : "text-text";

  const spinnerColor =
    variant === "primary" ? tokens.colors.black : tokens.colors.text;

  return (
    <HapticPressable
      disabled={isDisabled}
      onPress={onPress}
      haptic="selection"
      pressScale={0.98}
      pressOpacity={0.9}
      className={clsx(base, bg)}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      android_ripple={{ color: "#00000022" }}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <View className="flex-row items-center justify-center">
          {leftIcon ? <View className="mr-2">{leftIcon}</View> : null}
          <AppText
            variant="base"
            className={textClass}
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {label}
          </AppText>
        </View>
      )}
    </HapticPressable>
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <HapticPressable onPress={onPress} haptic="selection" pressScale={0.99} className="py-2">
      <AppText variant="sm" className="text-accent" style={{ fontFamily: "Inter_600SemiBold" }}>
        {label}
      </AppText>
    </HapticPressable>
  );
}
