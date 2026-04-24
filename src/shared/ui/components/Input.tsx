import React, { type ReactNode } from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import clsx from "clsx";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  variant?: "default" | "search" | "pill";
  containerClassName?: string;
  inputClassName?: string;
};

export function Input({
  label,
  error,
  leftIcon,
  variant = "default",
  editable = true,
  containerClassName,
  inputClassName,
  style,
  ...rest
}: Props) {
  const disabled = editable === false;
  const rounded = variant === "search" || variant === "pill" ? "rounded-full" : "rounded-lg";
  const inputBase = clsx(
    "w-full h-14 px-4 text-text bg-surface",
    rounded,
    disabled ? "opacity-60" : "",
    inputClassName
  );

  return (
    <View className={clsx("w-full", containerClassName)}>
      {label ? (
        <AppText variant="sm" tone="muted" className="mb-2">
          {label}
        </AppText>
      ) : null}

      {leftIcon ? (
        <View className={clsx("h-14 flex-row items-center border bg-surface px-4", rounded, error ? "border-danger" : "border-stroke", disabled ? "opacity-60" : "")}>
          <View className="mr-3">{leftIcon}</View>
          <TextInput
            {...rest}
            editable={!disabled}
            placeholderTextColor={tokens.colors.muted}
            className="flex-1 text-text"
            style={[{ fontFamily: "Inter_400Regular", color: tokens.colors.text }, style]}
          />
        </View>
      ) : (
        <TextInput
          {...rest}
          editable={!disabled}
          placeholderTextColor={tokens.colors.muted}
          className={clsx(inputBase, "border", error ? "border-danger" : "border-stroke")}
          style={[{ fontFamily: "Inter_400Regular", color: tokens.colors.text }, style]}
        />
      )}

      {error ? (
        <AppText variant="sm" tone="danger" className="mt-2">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export default Input;
