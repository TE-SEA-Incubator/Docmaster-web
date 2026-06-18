/** @type {import('tailwindcss').Config} */
module.exports = {
  // NativeWind requires the preset and processes files via the Metro transformer.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Mirrors the web app brand palette (src/tailwind.config.js).
        primary: {
          DEFAULT: "#F5A64B",
          dark: "#D98A30",
          light: "#FEF0DC",
        },
        green: {
          dark: "#1E3A2F",
          mid: "#2D5A42",
          light: "#E8F5EE",
        },
        bgMain: "#F4EFE6",
        surface: "#FFFFFF",
        surface2: "#FAF7F2",
        textMain: "#1A1A1A",
        textMuted: "#6B7280",
        borderMain: "#EAE3D8",
        accent: "#F5A64B",
        danger: "#DC2626",
        success: "#16A34A",
        warning: "#D97706",
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px",
      },
    },
  },
  plugins: [],
};
