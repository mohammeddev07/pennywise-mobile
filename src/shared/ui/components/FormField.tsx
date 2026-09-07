import React, { useState, type ReactNode } from "react";
import { TextInput, View, type TextInputProps } from "react-native";

import { AppText } from "@/shared/ui/components/AppText";
import { tokens } from "@/shared/ui/theme/tokens";

type Props = Omit<TextInputProps, "style"> & {
  label?: string;
  /** Rendered next to the label, e.g. "Optional". */
  hint?: string;
  error?: string;
  multiline?: boolean;
  /** Shows "n/max" under a multiline field. Requires `maxLength`. */
  showCount?: boolean;
  /** Fully rounded field, for search and filter inputs. */
  pill?: boolean;
  leftIcon?: ReactNode;
  containerStyle?: object;
};

/**
 * The one text input in the app. Screens used to build inputs inline with
 * their own heights and radii; anything that takes typed text goes through
 * here so focus, placeholder color and metrics stay identical.
 */
export function FormField({
  label,
  hint,
  error,
  multiline,
  showCount,
  pill,
  leftIcon,
  containerStyle,
  value,
  maxLength,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? tokens.colors.danger
    : focused
      ? `${tokens.colors.accent}66`
      : tokens.colors.stroke;

  return (
    <View style={containerStyle}>
      {label ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: tokens.space[2],
            marginBottom: tokens.space[2],
          }}
        >
          <AppText variant="xs" tone="muted">
            {label.toUpperCase()}
          </AppText>
          {hint ? (
            <AppText variant="xs" tone="subtle">
              {hint.toUpperCase()}
            </AppText>
          ) : null}
        </View>
      ) : null}

      <View
        style={{
          flexDirection: multiline ? "column" : "row",
          alignItems: multiline ? "stretch" : "center",
          minHeight: multiline ? 104 : tokens.layout.controlHeight,
          borderRadius: pill ? tokens.radii.pill : tokens.radii.md,
          borderWidth: 1,
          borderColor,
          backgroundColor: tokens.colors.surface,
          paddingHorizontal: tokens.space[4],
          paddingVertical: multiline ? tokens.space[3] : 0,
        }}
      >
        {leftIcon && !multiline ? (
          <View style={{ marginRight: tokens.space[3] }}>{leftIcon}</View>
        ) : null}

        <TextInput
          {...rest}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          textAlignVertical={multiline ? "top" : "center"}
          placeholderTextColor={tokens.colors.subtle}
          selectionColor={tokens.colors.accent}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            tokens.typography.base,
            {
              flex: 1,
              color: tokens.colors.text,
              minHeight: multiline ? 76 : undefined,
              paddingVertical: 0,
            },
          ]}
        />

        {multiline && showCount && maxLength ? (
          <AppText variant="xs" tone="subtle" style={{ alignSelf: "flex-end", marginTop: tokens.space[2] }}>
            {(value ?? "").length}/{maxLength}
          </AppText>
        ) : null}
      </View>

      {error ? (
        <AppText variant="sm" tone="danger" style={{ marginTop: tokens.space[2] }}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export default FormField;
