export const tokens = {
  // Keep existing keys for backwards compatibility
  colors: {
    app: "#0B0F14",
    ink: "#000000",
    surface: "#10151D",
    card: "#141A23",
    stroke: "#1C2430",
    accent: "#00C805",
    accentPressed: "#009624",
    text: "#E7EEF8",
    muted: "#93A4B7",
    danger: "#FF4D4D",
    warning: "#F59E0B",
    success: "#00C805",
    black: "#000000",
  },

  semantic: {
    bg: "#0B0F14",
    surface: "#10151D",
    surfaceAlt: "#141A23",
    text: "#E7EEF8",
    textMuted: "#93A4B7",
    border: "#1C2430",
    primary: "#00C805",
    primaryPressed: "#009624",
    danger: "#FF4D4D",
    warning: "#F59E0B",
    success: "#00C805",
    ink: "#000000",
  },

  // Allowed spacing only
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 32,
    8: 40,
  },

  // Allowed radii only
  radii: {
    sm: 8,
    md: 16, // inputs/buttons
    lg: 24, // cards
    xl: 32, // sheets
    pill: 9999,
  },

  // Typography tokens (Inter via expo-google-fonts)
  // IMPORTANT: Use fontFamily per weight so it works consistently with loaded fonts.
  typography: {
    xs: { fontSize: 12, lineHeight: 16, fontFamily: "Inter_500Medium" },
    sm: { fontSize: 14, lineHeight: 20, fontFamily: "Inter_500Medium" },
    base: { fontSize: 16, lineHeight: 22, fontFamily: "Inter_400Regular" },
    lg: { fontSize: 18, lineHeight: 24, fontFamily: "Inter_600SemiBold" },
    xl: { fontSize: 20, lineHeight: 28, fontFamily: "Inter_600SemiBold" },
    "2xl": { fontSize: 28, lineHeight: 34, fontFamily: "Inter_700Bold" },
    amount: { fontSize: 48, lineHeight: 52, fontFamily: "Inter_700Bold" },
  },

  layout: {
    screenPaddingX: 24,
    screenPadTop: 12,
    screenPadBottom: 16,
    sectionGap: 24,
    minTap: 44,
    iconTap: 48,
    maxContentWidth: 520,
  },

  elevation: {
    sheet: {
      ios: { shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 8 },
    },
    toast: {
      ios: { shadowOpacity: 0.25, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 6 },
    },
  },
} as const;

export type TextVariant = keyof typeof tokens.typography;
export type TextTone = "default" | "muted" | "danger" | "success" | "warning";
