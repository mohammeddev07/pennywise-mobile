import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { tokens } from "@/shared/ui/theme/tokens";

export function alphaColor(color: string | undefined, alpha = "22") {
  if (typeof color === "string" && /^#[0-9A-Fa-f]{6}$/.test(color)) return `${color}${alpha}`;
  return tokens.colors.greenSoft;
}

export function CategoryIcon({
  icon,
  color = tokens.colors.accent,
  size = 56,
  rounded = "full",
}: {
  icon: keyof typeof Ionicons.glyphMap | string;
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
        backgroundColor: alphaColor(color, "24"),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={icon as any} size={Math.round(size * 0.42)} color={color} />
    </View>
  );
}

export default CategoryIcon;
