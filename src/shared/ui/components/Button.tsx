import React, { useState, type ReactNode } from "react";
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { tokens } from "@/shared/ui/theme/tokens";
import { withAlpha } from "@/shared/ui/theme/color";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";

/**
 * `primary` and `secondary` are the two buttons the app should reach for.
 * `danger` is destructive, `outline`/`ghost` are quiet variants kept because
 * existing screens use them - `outline` resolves to the same secondary
 * treatment so there is only one quiet filled button in the product.
 */
type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "lg" | "md";

/**
 * A primary button normally carries the brand accent. In the add flow the
 * CTA takes the mode's color instead, so "Continue" reads as an expense
 * commitment before the amount is even parsed.
 */
type Tone = "accent" | "expense";

const HEIGHT: Record<Size, number> = {
  lg: tokens.layout.controlHeight, // 56
  md: tokens.layout.controlHeightSm, // 48
};

function surfaceFor(variant: Variant, pressed: boolean) {
  if (variant === "danger") return pressed ? withAlpha(tokens.colors.danger, 0.2) : tokens.colors.redSoft;
  if (variant === "ghost") return pressed ? tokens.colors.neutralSoft : "transparent";
  return pressed ? tokens.colors.surfacePressed : tokens.colors.surfaceAlt;
}

function labelColorFor(variant: Variant) {
  if (variant === "primary") return tokens.colors.onAccent;
  if (variant === "danger") return tokens.colors.danger;
  if (variant === "ghost") return tokens.colors.muted;
  return tokens.colors.text;
}

/** The two-stop vertical gradient that gives a filled button its lit face. */
function gradientFor(tone: Tone, pressed: boolean) {
  const base = tone === "expense" ? tokens.colors.danger : tokens.colors.accent;
  const deep = tone === "expense" ? tokens.colors.dangerPressed : tokens.colors.accentPressed;
  return pressed
    ? ([withAlpha(base, 0.88), deep] as const)
    : ([withAlpha(base, 1), deep] as const);
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  tone = "accent",
  className = "",
  disabled,
  loading,
  leftIcon,
  onDisabledPress,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  tone?: Tone;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  /**
   * Called instead of `onPress` while the button is disabled.
   *
   * A disabled CTA that swallows the tap silently reads as a broken button.
   * When a caller supplies this the button still looks disabled and still
   * reports `disabled` to assistive technology, but it can say why - the add
   * flow uses it to fire the Error haptic when Continue is pressed at zero.
   */
  onDisabledPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = !!disabled || !!loading;
  const isPrimary = variant === "primary";
  // Loading always swallows the press - a second submit is never wanted.
  const answersWhileDisabled = isDisabled && !loading && !!onDisabledPress;

  const labelColor = labelColorFor(variant);

  // A disabled button must still read as a button. Dropping opacity to 0.4
  // made the primary CTA vanish into the dark background, so disabled keeps a
  // visible surface and only mutes the label.
  const disabledSurface = isPrimary ? tokens.colors.surfaceAlt : tokens.colors.surface;

  const content = loading ? (
    <ActivityIndicator color={isDisabled ? tokens.colors.muted : labelColor} />
  ) : (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
      {leftIcon ? <View style={{ marginRight: tokens.space[2] }}>{leftIcon}</View> : null}
      <AppText
        variant="base"
        weight="bold"
        numberOfLines={1}
        style={{ color: isDisabled ? tokens.colors.muted : labelColor }}
      >
        {label}
      </AppText>
    </View>
  );

  const frame: ViewStyle = {
    width: "100%",
    height: HEIGHT[size],
    borderRadius: tokens.radii.pill,
    overflow: "hidden",
  };

  return (
    <HapticPressable
      disabled={isDisabled && !answersWhileDisabled}
      onPress={answersWhileDisabled ? onDisabledPress : onPress}
      // A button press is navigation or a submit; the submit's own confirmation
      // fires the haptic. Silent here keeps the policy "haptics confirm writes".
      haptic="none"
      pressScale={answersWhileDisabled ? 1 : 0.97}
      pressOpacity={1}
      className={className}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      android_ripple={{
        color: isPrimary ? tokens.colors.rippleOnAccent : tokens.colors.ripple,
      }}
      style={[
        frame,
        // Glow is reserved for a live primary action. A disabled or quiet
        // button never blooms.
        isPrimary && !isDisabled
          ? tone === "expense"
            ? tokens.glow.danger
            : tokens.glow.accent
          : tokens.glow.none,
        style,
      ]}
    >
      {isPrimary && !isDisabled ? (
        <LinearGradient
          colors={gradientFor(tone, pressed)}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: tokens.space[4],
          }}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            paddingHorizontal: tokens.space[4],
            backgroundColor: isDisabled ? disabledSurface : surfaceFor(variant, pressed),
            borderWidth: variant === "ghost" ? 0 : 1,
            borderColor:
              variant === "danger"
                ? withAlpha(tokens.colors.danger, 0.35)
                : tokens.colors.stroke,
            borderRadius: tokens.radii.pill,
          }}
        >
          {content}
        </View>
      )}
    </HapticPressable>
  );
}

export function LinkButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <HapticPressable
      onPress={onPress}
      haptic="none"
      pressScale={0.99}
      accessibilityRole="button"
      style={{ minHeight: tokens.layout.minTap, justifyContent: "center" }}
    >
      <AppText variant="sm" weight="bold" style={{ color: tokens.colors.accent }}>
        {label}
      </AppText>
    </HapticPressable>
  );
}

export default Button;
