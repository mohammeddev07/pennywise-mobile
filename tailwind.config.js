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
        app: "#0B0D0F",
        surface: "#121518",
        card: "#121518",
        surfaceAlt: "#181C20",
        surfacePressed: "#20252A",
        ink: "#0B0D0F",
        onAccent: "#0B0D0F",

        // Hairlines
        stroke: "#FFFFFF12",
        divider: "#FFFFFF0F",

        // Text ladder
        text: "#F5F7F8",
        muted: "#98A2AD",
        subtle: "#66707A",

        // Brand
        accent: "#00C805",
        accentPressed: "#00A804",
        accentSoft: "#00C8051F",

        // Money / status
        income: "#51D99B",
        incomeSoft: "#51D99B1F",
        danger: "#FF6B67",
        dangerSoft: "#FF6B671F",
        warning: "#F5A524",
        warningSoft: "#F5A5241F",
        success: "#51D99B",

        greenSoft: "#00C8051F",
        redSoft: "#FF6B671F",
        amberSoft: "#F5A5241F",
        blueSoft: "#5B8CFF1F",
        purpleSoft: "#8B5CF61F",
        neutralSoft: "#FFFFFF0D",
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "16px", // inputs / buttons
        xl: "20px", // cards
        "2xl": "28px", // bottom navigation / sheets
        full: "9999px",
      },
    },
  },
  plugins: [],
};
