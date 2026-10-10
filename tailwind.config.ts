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
        canvas: "#F4F5F6",
        surface: {
          DEFAULT: "#FFFFFF",
          muted: "#F0F1F2",
          subtle: "#EAECEF",
        },
        charcoal: {
          DEFAULT: "#25292F",
          hover: "#17191C",
          soft: "#3E434A",
          muted: "#656B73",
          light: "#8A9098",
        },
        brand: {
          DEFAULT: "#25292F",
          hover: "#17191C",
          active: "#0D0E10",
          soft: "#F0F1F2",
          foreground: "#FFFFFF",
          accent: "#656B73",
        },
        muted: {
          DEFAULT: "#F0F1F2",
          foreground: "#656B73",
          subtle: "#8A9098",
        },
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#17191C",
        },
        popover: {
          DEFAULT: "#FFFFFF",
          foreground: "#17191C",
        },
        primary: {
          DEFAULT: "#25292F",
          foreground: "#FFFFFF",
          hover: "#17191C",
          soft: "#F0F1F2",
        },
        secondary: {
          DEFAULT: "#F0F1F2",
          foreground: "#17191C",
          hover: "#E4E6E9",
        },
        destructive: {
          DEFAULT: "#17191C",
          foreground: "#FFFFFF",
          soft: "#F4F5F6",
        },
        border: {
          DEFAULT: "#E5E7EA",
          strong: "#D2D6DC",
        },
        input: "#E5E7EA",
        ring: "#25292F",
        sidebar: {
          DEFAULT: "#F4F5F6",
          foreground: "#17191C",
          muted: "#656B73",
          active: "#25292F",
          "active-foreground": "#FFFFFF",
          border: "#E5E7EA",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "18px",
        "3xl": "24px",
        "4xl": "28px",
      },
      fontFamily: {
        sans: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.03)",
        card: "0 2px 6px rgba(0,0,0,0.02), 0 1px 3px rgba(0,0,0,0.02)",
        elevated: "0 10px 30px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.02)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
