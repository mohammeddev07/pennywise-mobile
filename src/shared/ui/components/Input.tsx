import React from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import clsx from "clsx";

import { tokens } from "@/shared/ui/theme/tokens";
import { AppText } from "@/shared/ui/components/AppText";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  containerClassName?: string;
  inputClassName?: string;
};

export function Input({
  label,
  error,
  editable = true,
  containerClassName,
  inputClassName,
  style,
  ...rest
}: Props) {
  const disabled = editable === false;

  return (
    <View className={clsx("w-full", containerClassName)}>
      {label ? (
        <AppText variant="sm" tone="muted" className="mb-2">
          {label}
        </AppText>
      ) : null}

      <TextInput
        {...rest}
        editable={!disabled}
        placeholderTextColor={tokens.colors.muted}
        className={clsx(
          // Contract:
          // - height: 56 => h-14
          // - paddingX: 16 => px-4
          // - radius: 16 => rounded-lg (per tailwind.config.js)
          "w-full h-14 px-4 rounded-lg border text-text bg-surface",
          error ? "border-danger" : "border-stroke",
          disabled ? "opacity-60" : "",
          inputClassName
        )}
        style={[style]}
      />

      {error ? (
        <AppText variant="sm" tone="danger" className="mt-2">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export default Input;
