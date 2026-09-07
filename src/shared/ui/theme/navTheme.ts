import { DarkTheme, type Theme } from "@react-navigation/native";
import { tokens } from "./tokens";

export function getNavTheme(_colorScheme?: string): Theme {
  // The app is dark-first, so navigation containers must start dark too -
  // otherwise a white frame flashes behind every screen transition.
  const base = DarkTheme;

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
