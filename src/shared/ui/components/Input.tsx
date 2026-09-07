import React, { type ReactNode } from "react";
import { View, type TextInputProps } from "react-native";
import clsx from "clsx";

import { FormField } from "@/shared/ui/components/FormField";

type Props = TextInputProps & {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  /** `search`/`pill` round the field fully; metrics are otherwise identical. */
  variant?: "default" | "search" | "pill";
  containerClassName?: string;
};

/**
 * Thin compatibility wrapper over `FormField`, kept because several screens
 * already speak this API. New code should use `FormField` directly - both
 * render the same field, so there is only one input in the product.
 */
export function Input({
  label,
  error,
  leftIcon,
  variant = "default",
  editable = true,
  containerClassName,
  style,
  ...rest
}: Props) {
  const disabled = editable === false;

  return (
    <View className={clsx("w-full", containerClassName)} style={{ opacity: disabled ? 0.6 : 1 }}>
      <FormField
        {...rest}
        editable={!disabled}
        label={label}
        error={error}
        leftIcon={leftIcon}
        pill={variant !== "default"}
      />
    </View>
  );
}

export default Input;
