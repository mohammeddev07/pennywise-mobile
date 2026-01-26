/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Dark mode reference tokens
        primary: "#10b981",
        primaryDark: "#059669",
        backgroundDark: "#0f172a",
        cardDark: "#1e293b",
        textSecondary: "#94a3b8",

        // Light mode (from your light HTML screenshot)
        backgroundLight: "#f6f6f8",
        primaryLight: "#2b4bee",
        primaryLightDark: "#1a35b0",

        // Common text (light)
        textLight: "#111218",
        textMutedLight: "#616889"
      },
      borderRadius: {
        DEFAULT: "8px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        full: "9999px"
      }
    }
  },
  plugins: []
};
