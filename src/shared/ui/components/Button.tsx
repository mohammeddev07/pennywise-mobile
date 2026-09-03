import React, { useState, type ReactNode } from "react";
import { ActivityIndicator, View, type StyleProp, type ViewStyle } from "react-native";

import { tokens } from "@/shared/ui/theme/tokens";
import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { AppText } from "@/shared/ui/components/AppText";

/**
 * `primary` and `secondary` are the two buttons the app should reach for.
 * `danger` is destructive, `outline`/`ghost` are quiet variants kept because
 * existing screens use them - they resolve to the same secondary treatment so
 * there is only one quiet button in the product.
 */
type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "lg" | "md";

const HEIGHT: Record<Size, number> = {
  lg: tokens.layout.controlHeight, // 56
  md: tokens.layout.controlHeightSm, // 48
};

function surfaceFor(variant: Variant, pressed: boolean) {
  if (variant === "primary") return pressed ? tokens.colors.accentPressed : tokens.colors.accent;
  if (variant === "danger") return pressed ? tokens.colors.surfacePressed : tokens.colors.redSoft;
  if (variant === "ghost") return pressed ? tokens.colors.surfacePressed : "transparent";
  return pressed ? tokens.colors.surfacePressed : tokens.colors.surfaceAlt;
}

function labelColorFor(variant: Variant) {
  if (variant === "primary") return tokens.colors.onAccent;
  if (variant === "danger") return tokens.colors.danger;
  return tokens.colors.text;
}

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "lg",
  className = "",
  disabled,
  loading,
  leftIcon,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  className?: string;
  disabled?: boolean;
  loading?: boolean;
  leftIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const [pressed, setPressed] = useState(false);
  const isDisabled = !!disabled || !!loading;

  const labelColor = labelColorFor(variant);
  const background = surfaceFor(variant, pressed && !isDisabled);

  // A disabled button must still read as a button. Dropping opacity to 0.4
  // made the primary CTA vanish into the dark background, so disabled keeps a
  // visible surface and only mutes the label.
  const disabledSurface = variant === "primary" ? tokens.colors.surfaceAlt : tokens.colors.surface;

  return (
    <HapticPressable
      disabled={isDisabled}
      onPress={onPress}
      haptic="selection"
      pressScale={0.98}
      pressOpacity={1}
      className={className}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      android_ripple={{
        color: variant === "primary" ? tokens.colors.rippleOnAccent : tokens.colors.ripple,
      }}
      style={[
        {
          width: "100%",
          height: HEIGHT[size],
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: tokens.space[4],
          borderRadius: tokens.radii.md,
          backgroundColor: isDisabled ? disabledSurface : background,
          borderWidth: variant === "primary" ? 0 : 1,
          borderColor: variant === "danger" ? `${tokens.colors.danger}33` : tokens.colors.stroke,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isDisabled ? tokens.colors.muted : labelColor} />
      ) : (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
          {leftIcon ? <View style={{ marginRight: tokens.space[2] }}>{leftIcon}</View> : null}
          <AppText
            variant="base"
            weight="semibold"
            numberOfLines={1}
            style={{ color: isDisabled ? tokens.colors.muted : labelColor }}
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
    <HapticPressable
      onPress={onPress}
      haptic="selection"
      pressScale={0.99}
      style={{ minHeight: tokens.layout.minTap, justifyContent: "center" }}
    >
      <AppText variant="sm" weight="semibold" style={{ color: tokens.colors.accent }}>
        {label}
      </AppText>
    </HapticPressable>
  );
}

export default Button;
