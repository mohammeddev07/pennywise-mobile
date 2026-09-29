/**
 * Mirror of src/shared/ui/theme/tokens.ts.
 *
 * NativeWind classes and the `tokens` object are two views of one design
 * system - when a value changes here it must change there too, and vice versa.
 */
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Elevation ladder
        app: "var(--color-app)",
        surface: "var(--color-surface)",
        card: "var(--color-card)",
        surfaceAlt: "var(--color-surfaceAlt)",
        surfacePressed: "var(--color-surfacePressed)",
        ink: "var(--color-ink)",
        onAccent: "var(--color-onAccent)",

        // Hairlines
        stroke: "var(--color-stroke)",
        divider: "var(--color-divider)",
        edgeHighlight: "var(--color-edgeHighlight)",

        // Text ladder
        text: "var(--color-text)",
        muted: "var(--color-muted)",
        subtle: "var(--color-subtle)",

        // Brand
        accent: "var(--color-accent)",
        accentPressed: "var(--color-accentPressed)",
        accentSoft: "var(--color-accentSoft)",

        // Money / status
        income: "var(--color-income)",
        incomeSoft: "var(--color-incomeSoft)",
        danger: "var(--color-danger)",
        dangerSoft: "var(--color-dangerSoft)",
        warning: "var(--color-warning)",
        warningSoft: "var(--color-warningSoft)",
        success: "var(--color-success)",

        greenSoft: "var(--color-greenSoft)",
        redSoft: "var(--color-redSoft)",
        amberSoft: "var(--color-amberSoft)",
        blueSoft: "var(--color-blueSoft)",
        purpleSoft: "var(--color-purpleSoft)",
        neutralSoft: "var(--color-neutralSoft)",

        // Category identity. Icon stroke at full value, tile fill at ~13%.
        catFood: "#FFB35C",
        catGroceries: "#9BD881",
        catPersonalCare: "#7FD4E8",
        catRent: "#B49CFF",
        catTransport: "#7EA6FF",
        catFun: "#FF9ECF",
        catHealth: "#6FE5C9",
        catOther: "#A8B0BC",
      },
      fontFamily: {
        // Words. Schibsted Grotesk.
        sans: ["SchibstedGrotesk_400Regular"],
        medium: ["SchibstedGrotesk_500Medium"],
        semibold: ["SchibstedGrotesk_600SemiBold"],
        bold: ["SchibstedGrotesk_700Bold"],
        extrabold: ["SchibstedGrotesk_800ExtraBold"],
        // Numbers. Sora - currency amounts only.
        num: ["Sora_400Regular"],
        numSemibold: ["Sora_600SemiBold"],
        numBold: ["Sora_700Bold"],
      },
      borderRadius: {
        // Nothing in the app corners tighter than 14.
        DEFAULT: "14px",
        sm: "14px", // small chips, tiny tiles
        key: "18px", // keypad keys
        lg: "22px", // inputs / fields
        xl: "28px", // cards
        "2xl": "32px", // sheets
        full: "9999px",
      },
      spacing: {
        gutter: "24px",
        card: "20px",
      },
    },
  },
  plugins: [],
};
