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
        // Core app backgrounds
        app: "#0B0F14",     // global app background (near-black)
        ink: "#0B0F14",     // kept as an alias for legacy class names; never pure black
        surface: "#10151D", // elevated surfaces
        card: "#141A23",

        // Strokes & text
        stroke: "#1C2430",
        text: "#E7EEF8",
        muted: "#93A4B7",

        // Accent
        accent: "#22C55E",
        accentPressed: "#16A34A",

        // Optional utility
        danger: "#FF4D4D",

        // Keep your previous light tokens if you want (harmless)
        backgroundLight: "#f6f6f8",
        textLight: "#111218",
        textMutedLight: "#616889",

        // inside extend.colors
        warning: "#F59E0B",
        success: "#22C55E",
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
