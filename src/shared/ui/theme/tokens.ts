// Inter family map. Always set fontFamily explicitly: on Android a named font
// family makes `fontWeight` a no-op, so weight must be encoded in the family.
export const fonts = {
  light: "Inter_300Light",
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
} as const;

// Declared separately so `as const` below does not widen it to a readonly
// tuple, which would not satisfy TextStyle["fontVariant"].
const TABULAR: "tabular-nums"[] = ["tabular-nums"];

export const tokens = {
  // Keep existing keys for backwards compatibility while mapping them to the
  // light-first visual system from /Light_design.
  colors: {
    app: "#F8FAFC",
    ink: "#0B1220",
    surface: "#FFFFFF",
    card: "#FFFFFF",
    surfaceAlt: "#F3F7F4",
    stroke: "#E6EAF0",
    accent: "#00C313",
    accentPressed: "#00A80F",
    text: "#0B1220",
    muted: "#7A8596",
    danger: "#FF4D57",
    warning: "#F59E0B",
    success: "#00C313",
    black: "#000000",
    white: "#FFFFFF",
    greenSoft: "#EAFBEA",
    redSoft: "#FFE9EA",
    amberSoft: "#FFF4DD",
    blueSoft: "#EEF5FF",
    purpleSoft: "#F2EEFF",
    neutralSoft: "#F2F4F7",
  },

  semantic: {
    bg: "#F8FAFC",
    surface: "#FFFFFF",
    surfaceAlt: "#F3F7F4",
    text: "#0B1220",
    textMuted: "#7A8596",
    border: "#E6EAF0",
    primary: "#00C313",
    primaryPressed: "#00A80F",
    primarySoft: "#EAFBEA",
    danger: "#FF4D57",
    dangerSoft: "#FFE9EA",
    warning: "#F59E0B",
    warningSoft: "#FFF4DD",
    success: "#00C313",
    info: "#5B5BF7",
    infoSoft: "#EEF5FF",
    purple: "#8B5CF6",
    purpleSoft: "#F2EEFF",
    neutralSoft: "#F2F4F7",
    ink: "#0B1220",

    // Money semantics. Applied everywhere a signed amount is displayed via
    // `amountColor()` in @/shared/ui/theme/money - never read these directly
    // from a screen, so the whole app can be re-tuned from one place.
    income: "#00C313",
    expense: "#FF4D57",
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
    xs: { fontSize: 12, lineHeight: 16, fontFamily: fonts.medium },
    sm: { fontSize: 14, lineHeight: 20, fontFamily: fonts.medium },
    base: { fontSize: 16, lineHeight: 22, fontFamily: fonts.regular },
    lg: { fontSize: 18, lineHeight: 24, fontFamily: fonts.semibold, letterSpacing: -0.2 },
    xl: { fontSize: 20, lineHeight: 28, fontFamily: fonts.semibold, letterSpacing: -0.3 },
    "2xl": { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold, letterSpacing: -0.6 },
    "3xl": { fontSize: 40, lineHeight: 46, fontFamily: fonts.bold, letterSpacing: -1 },

    // Money displays. Tabular figures stop digits from reflowing while the
    // keypad edits the value; negative tracking keeps large numbers optical.
    amount: {
      fontSize: 48,
      lineHeight: 54,
      fontFamily: fonts.bold,
      letterSpacing: -1.4,
      fontVariant: TABULAR,
    },
    // Hero amount for the first step of the add-transaction flow.
    display: {
      fontSize: 60,
      lineHeight: 66,
      fontFamily: fonts.extrabold,
      letterSpacing: -2.4,
      fontVariant: TABULAR,
    },
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
    card: {
      ios: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.06,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 2 },
    },
    sheet: {
      ios: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 8 },
    },
    toast: {
      ios: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 6 },
    },
    tabBar: {
      ios: {
        shadowColor: "#0F172A",
        shadowOpacity: 0.09,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 10 },
      },
      android: { elevation: 8 },
    },
  },
} as const;

export type TextVariant = keyof typeof tokens.typography;
export type TextTone = "default" | "muted" | "danger" | "success" | "warning";
