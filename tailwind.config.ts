import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "#F5F4F1",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F9F8F6",
          subtle: "#EFEEEA",
        },
        brand: {
          DEFAULT: "#8F2635",
          hover: "#76202D",
          active: "#641B27",
          soft: "#F7E9EB",
          foreground: "#FFFFFF",
          accent: "#C96C75",
          "accent-soft": "#F9EFF0",
        },
        forest: {
          DEFAULT: "#1B4332",
          hover: "#143728",
          soft: "#E8F4ED",
          foreground: "#FFFFFF",
        },
        muted: {
          DEFAULT: "#F9F8F6",
          foreground: "#65666A",
          subtle: "#929398",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#191A1C",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#191A1C",
        },
        primary: {
          DEFAULT: "#8F2635",
          foreground: "#FFFFFF",
          hover: "#76202D",
          soft: "#F7E9EB",
        },
        secondary: {
          DEFAULT: "#EFEEEA",
          foreground: "#191A1C",
        },
        destructive: {
          DEFAULT: "#B83A43",
          foreground: "#FFFFFF",
          soft: "#FCEBED",
        },
        success: {
          DEFAULT: "#237A58",
          foreground: "#FFFFFF",
          soft: "#E8F4ED",
        },
        warning: {
          DEFAULT: "#A66B18",
          foreground: "#FFFFFF",
          soft: "#FBF2DF",
        },
        info: {
          DEFAULT: "#4B6D9B",
          foreground: "#FFFFFF",
          soft: "#EAF0F8",
        },
        border: {
          DEFAULT: "#E8E6E1",
          strong: "#D8D5CF",
        },
        input: "#E8E6E1",
        ring: "#8F2635",
        sidebar: {
          DEFAULT: "#FFFFFF",
          foreground: "#26272A",
          muted: "#8A8B90",
          active: "#F7E9EB",
          "active-foreground": "#8F2635",
          border: "#E8E6E1",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "18px",
        "3xl": "24px",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.04)",
        card: "0 2px 6px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.03)",
        elevated: "0 10px 30px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
