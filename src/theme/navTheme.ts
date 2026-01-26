import { DefaultTheme, DarkTheme, type Theme } from "@react-navigation/native";
import { TOKENS } from "./tokens";

export function getNavTheme(colorScheme?: string): Theme {
  const isDark = colorScheme === "dark";
  const t = isDark ? TOKENS.dark : TOKENS.light;

  const base = isDark ? DarkTheme : DefaultTheme;
  return {
    ...base,
    colors: {
      ...base.colors,
      background: t.background,
      card: t.card,
      text: t.text,
      primary: t.primary,
      border: isDark ? "#334155" : "#e5e7eb",
      notification: "#ef4444"
    }
  };
}
