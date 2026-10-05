/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#F5A64B",
          dark: "#E8923A",
          light: "#FEF3E2",
        },
        green: {
          dark: "#2D5A42",
          mid: "#3D7A5A",
          light: "#EAF4EE",
        },
        bgMain: "#FFFFFF",
        surface: "#FFFFFF",
        surface2: "#F9FAFB",
        textMain: "#1A1A1A",
        textMuted: "#6B7280",
        borderMain: "#EAE3D8",
        border: {
          primary: "#EAE3D8"
        },
        accent: "#F5A64B",
        blob: {
          green: "#A8CBAF",
          peach: "#E8B89A",
        },
      },
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        bricolage: ["Bricolage Grotesque", "sans-serif"],
        boogaloo: ["Boogaloo", "cursive"],
      },
      borderRadius: {
        sm: "3px",
        DEFAULT: "6px",
        md: "8px",
        lg: "10px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "20px",
        "4xl": "24px",
        "5xl": "28px",
        "6xl": "32px",
        "7xl": "35px",
        "8xl": "40px",
      },
      animation: {
        vibrate: "vibrate 0.3s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        "float-slow": "float 5s ease-in-out infinite",
        "float-slower": "float 6s ease-in-out infinite",
        "molecule-blob": "moleculeBlob 6s ease-in-out infinite alternate",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "fade-in-scale": "fadeInScale 0.7s cubic-bezier(0.23, 1, 0.32, 1) forwards",
        shimmer: "shimmer 3s linear infinite",
        "rotate-border": "rotate-border 4s linear infinite",
        "slide-up": "slideUp 0.6s ease forwards",
      },
      keyframes: {
        vibrate: {
          "0%, 100%": { transform: "translateX(0)" },
          "10%, 50%, 90%": { transform: "translateX(-3px)" },
          "30%, 70%": { transform: "translateX(3px)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        moleculeBlob: {
          "0%": {
            transform: "scale(1) translate(0, 0) rotate(0deg)",
            borderRadius: "50% 55% 45% 50% / 50% 45% 55% 50%",
          },
          "25%": {
            transform: "scale(1.1) translate(10px, -5px) rotate(5deg)",
            borderRadius: "45% 60% 40% 55% / 55% 40% 60% 45%",
          },
          "50%": {
            transform: "scale(0.9) translate(-10px, -10px) rotate(-8deg)",
            borderRadius: "55% 50% 60% 45% / 50% 55% 40% 60%",
          },
          "75%": {
            transform: "scale(1.05) translate(5px, 5px) rotate(3deg)",
            borderRadius: "50% 45% 55% 50% / 60% 50% 55% 45%",
          },
          "100%": {
            transform: "scale(1) translate(0, 0) rotate(0deg)",
            borderRadius: "50% 55% 45% 50% / 50% 45% 55% 50%",
          },
        },
        "pulse-dot": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(245, 166, 75, 0.5)" },
          "70%": { boxShadow: "0 0 0 10px rgba(245, 166, 75, 0)" },
        },
        fadeInScale: {
          from: {
            opacity: "0",
            transform: "translateY(15px) scale(0.98)",
            filter: "blur(4px)",
          },
          to: {
            opacity: "1",
            transform: "translateY(0) scale(1)",
            filter: "blur(0)",
          },
        },
        shimmer: {
          to: { backgroundPosition: "200% center" },
        },
        "rotate-border": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

