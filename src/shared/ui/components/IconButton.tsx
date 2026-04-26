import React, { type ReactNode, useState } from "react";
import { Ionicons } from "@expo/vector-icons";

import { HapticPressable } from "@/shared/ui/components/HapticPressable";
import { tokens } from "@/shared/ui/theme/tokens";

type Tone = "default" | "primary" | "danger" | "soft";

export function IconButton({
  icon,
  onPress,
  tone = "default",
  disabled,
  children,
  size = 48,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  tone?: Tone;
  disabled?: boolean;
  children?: ReactNode;
  size?: number;
}) {
  const [pressed, setPressed] = useState(false);
  const color =
    tone === "primary"
      ? tokens.colors.white
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
          : tokens.colors.surface;

  return (
    <HapticPressable
      onPress={onPress}
      disabled={disabled}
      haptic="selection"
      pressScale={0.96}
      pressOpacity={1}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      android_ripple={{ color: "#0B122012", borderless: true }}
      style={{
        width: size,
        height: size,
        borderRadius: tokens.radii.pill,
        borderWidth: tone === "primary" ? 0 : 1,
        borderColor: tokens.colors.stroke,
        backgroundColor,
        alignItems: "center",
        justifyContent: "center",
        ...(tone === "primary" ? tokens.elevation.tabBar.ios : {}),
      }}
    >
      {children ?? (icon ? <Ionicons name={icon} size={size >= 56 ? 28 : 22} color={color} /> : null)}
    </HapticPressable>
  );
}

export default IconButton;
