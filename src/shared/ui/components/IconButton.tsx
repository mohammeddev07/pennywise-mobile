import React, { type ReactNode, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";

type Tone = "default" | "primary" | "danger" | "soft";

/** Circular icon action. Never smaller than the 44px minimum touch target. */
export function IconButton({
  icon,
  onPress,
  tone = "default",
  disabled,
  children,
  size = tokens.layout.iconTap,
  accessibilityLabel,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  children?: ReactNode;
  size?: number;
  accessibilityLabel?: string;
}) {
  const [pressed, setPressed] = useState(false);

  const color =
    tone === "primary"
      ? tokens.colors.onAccent
      : tone === "danger"
        ? tokens.colors.danger
        : tone === "soft"
          ? tokens.colors.accent
          : tokens.colors.text;

  const backgroundColor =
    tone === "primary"
      ? pressed
        ? tokens.colors.accentPressed
        : tokens.colors.accent
      : tone === "danger"
        ? tokens.colors.redSoft
        : tone === "soft"
          ? tokens.colors.greenSoft
          : pressed
            ? tokens.colors.surfacePressed
            : tokens.colors.surface;

  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      pressScale={0.94}
      pressOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? icon}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      android_ripple={{
        color: tone === "primary" ? tokens.colors.rippleOnAccent : tokens.colors.ripple,
        borderless: true,
      }}
      style={{
        width: Math.max(size, tokens.layout.minTap),
        height: Math.max(size, tokens.layout.minTap),
        borderRadius: tokens.radii.pill,
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: tokens.colors.stroke,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children ?? (icon ? <Ionicons name={icon} size={size >= 56 ? 24 : 20} color={color} /> : null)}
    </HapticPressable>
  );
}

export default IconButton;
