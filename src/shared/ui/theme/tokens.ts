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

/**
 * Dark-first premium fintech palette.
 *
 * Every color in the app comes from here. Keys are stable - screens were
 * written against `colors.surface`, `colors.stroke`, `semantic.income` and so
 * on, so retheming happens in this file (plus its mirror in
 * tailwind.config.js) rather than screen by screen.
 *
 * Alpha is expressed as 8-digit hex because several call sites build tints by
 * concatenating (`${color}22`); keeping every base color a plain 6-digit hex
 * keeps that pattern valid.
 */
export const tokens = {
  colors: {
    // Elevation ladder. Nothing in the app should invent a background between
    // these four steps.
    app: "#0B0D0F",
    surface: "#121518",
    card: "#121518",
    surfaceAlt: "#181C20",
    surfacePressed: "#20252A",

    // Ink used *on top of* brand green (primary buttons, the add button).
    ink: "#0B0D0F",
    onAccent: "#0B0D0F",

    // Hairlines. Borders are slightly stronger than dividers so a card edge
    // still reads while an in-card separator stays quiet.
    stroke: "#FFFFFF12",
    divider: "#FFFFFF0F",

    // Text ladder: primary / secondary / tertiary.
    text: "#F5F7F8",
    muted: "#98A2AD",
    subtle: "#66707A",

    // Brand. Reserved for primary actions, active nav, selection and success -
    // not for decoration.
    accent: "#00C805",
    accentPressed: "#00A804",

    // Money semantics.
    income: "#51D99B",
    danger: "#FF6B67",
    warning: "#F5A524",
    success: "#51D99B",

    black: "#000000",
    white: "#FFFFFF",

    // Soft tints. On a dark ground these are alpha washes rather than pastel
    // fills, so they sit on any surface without banding.
    greenSoft: "#00C8051F",
    incomeSoft: "#51D99B1F",
    redSoft: "#FF6B671F",
    amberSoft: "#F5A5241F",
    blueSoft: "#5B8CFF1F",
    purpleSoft: "#8B5CF61F",
    neutralSoft: "#FFFFFF0D",

    // Android ripple. Light on dark surfaces, dark on brand-green ones.
    ripple: "#FFFFFF14",
    rippleOnAccent: "#0B0D0F26",
  },

  semantic: {
    bg: "#0B0D0F",
    surface: "#121518",
    surfaceAlt: "#181C20",
    surfacePressed: "#20252A",
    text: "#F5F7F8",
    textMuted: "#98A2AD",
    textSubtle: "#66707A",
    border: "#FFFFFF12",
    divider: "#FFFFFF0F",
    primary: "#00C805",
    primaryPressed: "#00A804",
    primarySoft: "#00C8051F",
    danger: "#FF6B67",
    dangerSoft: "#FF6B671F",
    warning: "#F5A524",
    warningSoft: "#F5A5241F",
    success: "#51D99B",
    info: "#5B8CFF",
    infoSoft: "#5B8CFF1F",
    purple: "#8B5CF6",
    purpleSoft: "#8B5CF61F",
    neutralSoft: "#FFFFFF0D",
    ink: "#0B0D0F",

    // Money semantics. Applied everywhere a signed amount is displayed via
    // `amountColor()` in @/shared/ui/theme/money - never read these directly
    // from a screen, so the whole app can be re-tuned from one place.
    income: "#51D99B",
    expense: "#FF6B67",
  },

  // 8-point spacing. Nothing outside this scale.
  space: {
    0: 0,
    1: 4, // micro
    2: 8, // compact
    3: 12, // related items
    4: 16, // standard
    5: 20, // screen gutter
    6: 24, // section spacing
    7: 32, // major separation
    8: 40,
  },

  // Allowed radii only. Equivalent components must share a value.
  radii: {
    sm: 8,
    md: 16, // inputs / buttons
    lg: 20, // cards
    xl: 28, // bottom navigation / sheets
    pill: 9999,
  },

  /**
   * Type scale. Weight is baked into `fontFamily` because Android ignores
   * `fontWeight` once a named family is set; `AppText`'s `weight` prop swaps
   * the family rather than the weight.
   */
  typography: {
    // Overline / metadata
    xs: { fontSize: 12, lineHeight: 16, fontFamily: fonts.semibold, letterSpacing: 0.4 },
    // Secondary
    sm: { fontSize: 14, lineHeight: 20, fontFamily: fonts.regular },
    // Body / row title (pair with weight="semibold" for a row title)
    base: { fontSize: 16, lineHeight: 22, fontFamily: fonts.regular },
    // Section title
    lg: { fontSize: 18, lineHeight: 24, fontFamily: fonts.semibold, letterSpacing: -0.2 },
    xl: { fontSize: 20, lineHeight: 28, fontFamily: fonts.semibold, letterSpacing: -0.3 },
    // Page title
    "2xl": { fontSize: 28, lineHeight: 34, fontFamily: fonts.bold, letterSpacing: -0.6 },
    "3xl": { fontSize: 30, lineHeight: 38, fontFamily: fonts.bold, letterSpacing: -0.8 },

    // Money displays. Tabular figures stop digits from reflowing while the
    // keypad edits the value; negative tracking keeps large numbers optical.
    amount: {
      fontSize: 40,
      lineHeight: 46,
      fontFamily: fonts.bold,
      letterSpacing: -1.2,
      fontVariant: TABULAR,
    },
    // Hero amount: the balance on Home, the value being typed in the add flow.
    display: {
      fontSize: 58,
      lineHeight: 64,
      fontFamily: fonts.bold,
      letterSpacing: -2,
      fontVariant: TABULAR,
    },
  },

  layout: {
    screenPaddingX: 20,
    screenPaddingXCompact: 16,
    screenPadTop: 12,
    screenPadBottom: 16,
    sectionGap: 24,
    minTap: 44,
    iconTap: 48,
    controlHeight: 56, // primary buttons, inputs, select rows
    controlHeightSm: 48,
    maxContentWidth: 520,
    tabBarHeight: 68,
  },

  motion: {
    fast: 150,
    base: 200,
    slow: 250,
  },

  /**
   * Shadows are close to invisible on a dark ground, so elevation is carried
   * by surface color and hairlines. What remains here only separates floating
   * chrome (tab bar, toast, sheet) from the content scrolling under it.
   */
  elevation: {
    card: {
      ios: {},
      android: { elevation: 0 },
    },
    sheet: {
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.5,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 12 },
    },
    toast: {
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.45,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 8 },
    },
    tabBar: {
      ios: {
        shadowColor: "#000000",
        shadowOpacity: 0.4,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 8 },
      },
      android: { elevation: 10 },
    },
  },
} as const;

export type TextVariant = keyof typeof tokens.typography;
export type TextTone = "default" | "muted" | "subtle" | "danger" | "success" | "warning";
