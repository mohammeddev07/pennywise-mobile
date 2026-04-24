import { DefaultTheme, type Theme } from "@react-navigation/native";
import { tokens } from "./tokens";

export function getNavTheme(_colorScheme?: string): Theme {
  const base = DefaultTheme;

  const mapped = {
    background: tokens.colors.app,
    card: tokens.colors.surface,
    text: tokens.colors.text,
    primary: tokens.colors.accent,
    border: tokens.colors.stroke,
    notification: tokens.colors.danger,
  };

  return {
    ...base,
    colors: {
      ...base.colors,
      ...mapped,
    },
  };
}
