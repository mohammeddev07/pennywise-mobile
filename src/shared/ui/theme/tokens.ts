import type { TextStyle } from "react-native";

/**
 * Type families.
 *
 * Two faces, split by content type — this is the rule the whole system hangs
 * on: **if the content is a currency amount it is Sora; if it is a word it is
 * Schibsted Grotesk.** Never mix within one text node, except the small "$"
 * prefix (Sora, tertiary color, roughly half the number size).
 *
 * Weight is always encoded in the family name. On Android a named font family
 * makes `fontWeight` a no-op, so weight *must* travel through the family —
 * this is a correctness rule, not a preference.
 */
export const fonts = {
  light: "SchibstedGrotesk_400Regular",
  regular: "SchibstedGrotesk_400Regular",
  medium: "SchibstedGrotesk_500Medium",
  semibold: "SchibstedGrotesk_600SemiBold",
  bold: "SchibstedGrotesk_700Bold",
  extrabold: "SchibstedGrotesk_800ExtraBold",
} as const;

/** Sora. Numerals only — amounts, balances, keypad digits, chart values. */
export const numerals = {
  // `light` has no Sora counterpart in use; it maps to regular so a shared
  // weight key never resolves to undefined.
  light: "Sora_400Regular",
  regular: "Sora_400Regular",
  medium: "Sora_500Medium",
  semibold: "Sora_600SemiBold",
  bold: "Sora_700Bold",
  extrabold: "Sora_800ExtraBold",
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
    // these four steps. Depth is layer + hairline + (for the accent only)
    // glow - never a black drop shadow.
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
    // Top-edge highlight that gives each surface layer its lift. Applied as a
    // 1px inner top border, never as a shadow.
    edgeHighlight: "#FFFFFF14",

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
    dangerPressed: "#D8524E",
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

  /**
   * Category identity colors. A category icon never floats bare: it sits in a
   * 30-44px circle filled with its color at ~13% alpha, with the icon stroked
   * in the full color. These are identity, not brand - they are the only place
   * outside the money semantics where a non-brand hue is allowed.
   */
  category: {
    food: "#FFB35C",
    groceries: "#9BD881",
    personalCare: "#7FD4E8",
    rent: "#B49CFF",
    transport: "#7EA6FF",
    fun: "#FF9ECF",
    health: "#6FE5C9",
    other: "#A8B0BC",
  },

  // 8-point spacing. Nothing outside this scale.
  space: {
    0: 0,
    1: 4, // micro
    2: 8, // compact
    3: 12, // related items
    4: 16, // standard
    5: 20,
    6: 24, // screen gutter / section spacing
    7: 32, // major separation
    8: 40,
  },

  /**
   * Allowed radii only. Equivalent components must share a value.
   * Nothing in the app corners tighter than 14.
   */
  radii: {
    sm: 14, // small chips, tiny tiles
    key: 22, // keypad keys
    md: 22, // inputs, fields, buttons with a fixed width
    lg: 28, // cards
    xl: 32, // sheets
    pill: 9999, // pills, filter chips, the dock, primary buttons
  },

  /**
   * Type scale.
   *
   * `display*` and `amount*` are Sora and carry tabular figures so a counting
   * or edited value never reflows. Everything else is Schibsted Grotesk.
   * Weight is baked into `fontFamily` because Android ignores `fontWeight`
   * once a named family is set; `AppText`'s `weight` prop swaps the family.
   */
  typography: {
    // Overline / caps label
    xs: { fontSize: 11, lineHeight: 15, fontFamily: fonts.semibold, letterSpacing: 2 },
    // Body / meta
    sm: { fontSize: 13, lineHeight: 19, fontFamily: fonts.regular },
    // Row title / button label
    base: { fontSize: 15, lineHeight: 21, fontFamily: fonts.regular },
    // Section title
    lg: { fontSize: 17, lineHeight: 23, fontFamily: fonts.bold, letterSpacing: -0.2 },
    xl: { fontSize: 20, lineHeight: 27, fontFamily: fonts.bold, letterSpacing: -0.3 },
    // Screen title
    "2xl": { fontSize: 26, lineHeight: 32, fontFamily: fonts.bold, letterSpacing: -0.6 },
    "3xl": { fontSize: 30, lineHeight: 38, fontFamily: fonts.bold, letterSpacing: -0.8 },

    // ---- Money. Sora, tabular. ----
    // Amount S: list rows, compact stats.
    amountSm: {
      fontSize: 15,
      lineHeight: 20,
      fontFamily: numerals.bold,
      fontVariant: TABULAR,
    },
    // Display M: net figures, the success receipt.
    amount: {
      fontSize: 44,
      lineHeight: 50,
      fontFamily: numerals.bold,
      letterSpacing: -1.2,
      fontVariant: TABULAR,
    },
    // Display XL: the balance on Home.
    display: {
      fontSize: 62,
      lineHeight: 64,
      fontFamily: numerals.bold,
      letterSpacing: -1,
      fontVariant: TABULAR,
    },
    // Display L: the value being typed in the add flow. Autoshrinks past 6
    // digits - see `amountFontSize()` below.
    displayLg: {
      fontSize: 72,
      lineHeight: 74,
      fontFamily: numerals.bold,
      letterSpacing: -2,
      fontVariant: TABULAR,
    },
  },

  layout: {
    screenPaddingX: 24,
    screenPaddingXCompact: 20,
    screenPadTop: 8,
    screenPadBottom: 16,
    sectionGap: 28,
    cardPadding: 20,
    cardGap: 12,
    listRowHeight: 72,
    minTap: 44,
    iconTap: 48,
    controlHeight: 56, // primary buttons, inputs, select rows
    controlHeightSm: 48,
    keyHeight: 60, // keypad key
    maxContentWidth: 520,
    tabBarHeight: 78,
    fabSize: 58,
  },

  /** Icon sizing. One family (Lucide), stroke 2.2, round caps and joins. */
  icon: {
    strokeWidth: 2.2,
    nav: 22, // tab bar and screen headers
    row: 19, // list keys, settings rows
    chip: 16, // chips and inline
    inline: 16,
  },

  motion: {
    // Timings, in ms. Nothing exceeds 400 except the success moment.
    pressIn: 90,
    fast: 150,
    base: 200,
    slow: 250,
    crossfade: 180,
    modeSwitch: 280,
    countDelta: 600,
    ring: 700,
    countMount: 900,
    success: 650,
    listStagger: 24,
  },

  /**
   * Reanimated spring presets. Cause precedes effect: the pressed control
   * moves first, the screen answers.
   */
  spring: {
    snappy: { stiffness: 380, damping: 22 },
    gentle: { stiffness: 260, damping: 28 },
    bouncy: { stiffness: 260, damping: 12 },
    key: { stiffness: 420, damping: 18 }, // keypad key release
    digit: { stiffness: 340, damping: 20 }, // a digit landing
    thumb: { stiffness: 300, damping: 24 }, // segmented control thumb
    chipIcon: { stiffness: 400, damping: 15 }, // category chip icon pop
    list: { stiffness: 280, damping: 24 }, // row insert / stagger
  },

  /**
   * Haptics policy. Haptics confirm *writes*, never *reads*.
   *
   * Explicitly silent: tab navigation, scrolling, opening/closing screens,
   * filter and time chips, chevron rows, text-field focus, and the
   * "Add another" / "Done" buttons on success (the save already fired).
   */
  haptics: {
    key: "impactLight", // keypad key and backspace
    modeToggle: "impactMedium", // Expense <-> Income
    categorySelect: "selection", // a commit, not navigation
    saveSuccess: "notificationSuccess",
    destructiveConfirm: "notificationWarning",
    invalidAction: "notificationError", // Next at $0
    refreshTrigger: "impactLight", // once, at the threshold
  },

  /**
   * Depth.
   *
   * There are **no black drop shadows**. Elevation is the four-layer surface
   * stack plus a 1px top-edge highlight. Glow is reserved for the accent -
   * the add button, primary buttons, the success check and the live chart
   * point - and never decorates an ordinary card or row.
   */
  elevation: {
    card: { ios: {}, android: { elevation: 0 } },
    sheet: { ios: {}, android: { elevation: 0 } },
    toast: { ios: {}, android: { elevation: 0 } },
    tabBar: { ios: {}, android: { elevation: 0 } },
  },

  /** Accent glows. `shadowOffset` stays at zero so the light reads as a bloom. */
  glow: {
    // Add button, primary CTA.
    accent: {
      shadowColor: "#00C805",
      shadowOpacity: 0.45,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    // Softer: chart point, selected chip.
    accentSoft: {
      shadowColor: "#00C805",
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    // The success check.
    success: {
      shadowColor: "#51D99B",
      shadowOpacity: 0.5,
      shadowRadius: 40,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    // Expense-mode CTA, so the mode reads without relying on color alone.
    danger: {
      shadowColor: "#FF6B67",
      shadowOpacity: 0.35,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
    none: {
      shadowColor: "transparent",
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
      elevation: 0,
    },
  },

  /**
   * Ambient screen wash. A single radial-ish gradient at the top edge, never
   * above 12% alpha, that tints a screen to its mode. Consumed by `Screen`.
   */
  ambient: {
    accent: ["#00C8051A", "#00C80500"],
    income: ["#51D99B1A", "#51D99B00"],
    expense: ["#FF6B671A", "#FF6B6700"],
    neutral: ["#FFFFFF0A", "#FFFFFF00"],
    none: ["#00000000", "#00000000"],
  },
} as const;

/**
 * Keypad amount autoshrink. The display-L size holds up to 6 glyphs; past
 * that the value steps down rather than clipping or wrapping.
 */
export function amountFontSize(text: string) {
  const digits = text.replace(/[^0-9]/g, "").length;
  if (digits <= 6) return tokens.typography.displayLg.fontSize;
  if (digits <= 8) return 56;
  return 48;
}

export type TextVariant = keyof typeof tokens.typography;
export type TextTone = "default" | "muted" | "subtle" | "danger" | "success" | "warning";
export type AmbientTone = keyof typeof tokens.ambient;

/** Convenience for the `$` prefix rule: Sora, tertiary, ~50% of the number. */
export function currencyPrefixStyle(amountSize: number): TextStyle {
  return {
    fontFamily: numerals.bold,
    fontSize: Math.round(amountSize * 0.5),
    color: tokens.colors.subtle,
    lineHeight: Math.round(amountSize * 0.62),
  };
}
