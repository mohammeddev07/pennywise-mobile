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
        // Core light app backgrounds
        app: "#F8FAFC",
        ink: "#0B1220",
        surface: "#FFFFFF",
        card: "#FFFFFF",
        surfaceAlt: "#F3F7F4",

        // Strokes & text
        stroke: "#E6EAF0",
        text: "#0B1220",
        muted: "#7A8596",

        // Accent
        accent: "#00C313",
        accentPressed: "#00A80F",
        accentSoft: "#EAFBEA",

        // Optional utility
        danger: "#FF4D57",
        dangerSoft: "#FFE9EA",

        backgroundLight: "#F8FAFC",
        textLight: "#0B1220",
        textMutedLight: "#7A8596",

        warning: "#F59E0B",
        warningSoft: "#FFF4DD",
        success: "#00C313",
        greenSoft: "#EAFBEA",
        redSoft: "#FFE9EA",
        amberSoft: "#FFF4DD",
        blueSoft: "#EEF5FF",
        purpleSoft: "#F2EEFF",
        neutralSoft: "#F2F4F7",
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        full: "9999px",
      },
    },
  },
  plugins: [],
};
