import React, { useRef, useState, type ReactNode } from "react";
import { Pressable, TextInput, View, type TextInputProps, type TextStyle } from "react-native";

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
  /** Read-only and visibly inert: muted text, no focus ring. Same as `editable={false}`. */
  disabled?: boolean;
  containerStyle?: object;
};

/**
 * Web only. The browser draws its own square focus outline on the inner
 * <input>, which sat inside the rounded field as a white rectangle. The field
 * border below is the one focus indicator.
 */
const NO_NATIVE_OUTLINE = { outlineStyle: "none" } as unknown as TextStyle;

/**
 * The one text input in the app. Screens used to build inputs inline with
 * their own heights and radii; anything that takes typed text goes through
 * here so focus, placeholder color and metrics stay identical.
 *
 * States: rest (hairline) -> focus (solid accent border, 8:1 on the surface) ->
 * error (danger border, message below, announced) -> disabled (muted text, no
 * fade). The border is 1px in every state, so nothing shifts when it changes.
 */
export function FormField({
  label,
  hint,
  error,
  multiline,
  showCount,
  pill,
  leftIcon,
  disabled,
  editable,
  containerStyle,
  value,
  maxLength,
  onFocus,
  onBlur,
  accessibilityLabel,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  const input = useRef<TextInput>(null);
  const inert = disabled || editable === false;

  const borderColor = error
    ? tokens.colors.danger
    : focused && !inert
      ? tokens.colors.accent
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

      {/* The whole 56px field focuses the input: a TextInput alone is only one text line (21px) tall, so
          tapping the padding used to do nothing. Not a separate control for assistive tech (`accessible` off). */}
      <Pressable
        accessible={false}
        // Not a tab stop: the input inside is the focusable control.
        focusable={false}
        tabIndex={-1}
        onPress={() => input.current?.focus()}
        disabled={inert}
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
          <View style={{ marginRight: tokens.space[3], alignItems: "center", justifyContent: "center" }}>
            {leftIcon}
          </View>
        ) : null}

        <TextInput
          {...rest}
          ref={input}
          value={value}
          maxLength={maxLength}
          multiline={multiline}
          editable={!inert}
          // Screen readers otherwise announce only the placeholder, or nothing.
          accessibilityLabel={accessibilityLabel ?? label}
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
            NO_NATIVE_OUTLINE,
            {
              flex: 1,
              // Without this a web <input> keeps its intrinsic width and spills
              // out of a narrow field (two side-by-side amount fields overlapped).
              minWidth: 0,
              color: inert ? tokens.colors.muted : tokens.colors.text,
              minHeight: multiline ? 76 : undefined,
              paddingVertical: 0,
            },
          ]}
        />

        {multiline && showCount && maxLength ? (
          <AppText variant="caption" tone="subtle" style={{ alignSelf: "flex-end", marginTop: tokens.space[2] }}>
            {(value ?? "").length}/{maxLength}
          </AppText>
        ) : null}
      </Pressable>

      {error ? (
        <AppText
          variant="sm"
          tone="danger"
          role="alert"
          accessibilityLiveRegion="polite"
          style={{ marginTop: tokens.space[2] }}
        >
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export default FormField;
