import { DefaultTheme, DarkTheme, type Theme } from "@react-navigation/native";
import { tokens } from "./tokens";

export function getNavTheme(colorScheme?: string): Theme {
  const isDark = (colorScheme ?? "dark") === "dark";
  const base = isDark ? DarkTheme : DefaultTheme;

  const mapped = isDark
    ? {
        background: tokens.colors.app,
        card: tokens.colors.card,
        text: tokens.colors.text,
        primary: tokens.colors.accent,
        border: tokens.colors.stroke,
        notification: "#ef4444",
      }
    : {
        // Light fallback (we’re dark-first; we’ll refine later if needed)
        background: "#F6F6F8",
        card: "#FFFFFF",
        text: "#111218",
        primary: tokens.colors.accent,
        border: "#E5E7EB",
        notification: "#ef4444",
      };

  return {
    ...base,
    colors: {
      ...base.colors,
      ...mapped,
    },
  };
}
