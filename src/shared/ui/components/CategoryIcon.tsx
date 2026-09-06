import React from "react";
import { View } from "react-native";

import { tokens } from "@/shared/ui/theme/tokens";
import { Icon, type IconName } from "./Icon";

export function alphaColor(color: string | undefined, alpha = "22") {
  if (typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color)) return `${color}${alpha}`;
  return tokens.colors.neutralSoft;
}

export function CategoryIcon({
  icon,
  color = tokens.colors.accent,
  size = 40,
  rounded = "full",
}: {
  icon: IconName | string;
  color?: string;
  size?: number;
  rounded?: "full" | "lg";
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: rounded === "full" ? tokens.radii.pill : tokens.radii.md,
        // A category icon never floats bare: it sits in a circle filled with
        // its own color at ~13% alpha, with the glyph stroked in the full
        // value. No hairline - the tint is the shape.
        backgroundColor: alphaColor(color, "22"),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={icon as any} size={Math.round(size * 0.48)} color={color} />
    </View>
  );
}

export default CategoryIcon;
