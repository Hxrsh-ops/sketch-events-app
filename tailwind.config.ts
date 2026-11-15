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
        canvas: "var(--canvas)",
        surface: {
          DEFAULT: "var(--card)",
          inset: "var(--surface-inset)",
          elevated: "var(--surface-elevated)",
          muted: "var(--card-muted)",
          subtle: "var(--accent)",
          secondary: "#F6F7F8",
        },
        charcoal: {
          DEFAULT: "#34383D",
          hover: "#25282B",
          soft: "#4E545B",
          muted: "#858B93",
          light: "#A4A9AF",
        },
        brand: {
          DEFAULT: "#34383D",
          hover: "#25282B",
          active: "#1E2023",
          soft: "#F6F7F8",
          foreground: "#34383D",
          accent: "#858B93",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
          subtle: "#A4A9AF",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
          border: "var(--card-border)",
          hover: "var(--card-border-hover)",
          muted: "var(--card-muted)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          hover: "var(--primary-hover)",
          soft: "var(--secondary)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
          hover: "var(--secondary-hover)",
        },
        destructive: {
          DEFAULT: "#34383D",
          foreground: "#FFFFFF",
          soft: "#F6F7F8",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--card-border-hover)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
        sidebar: {
          DEFAULT: "#F2F3F4",
          foreground: "#34383D",
          muted: "#858B93",
          active: "#E5E7E9",
          "active-foreground": "#34383D",
          border: "#E5E7E9",
        },
        // Exact Monochromatic Tokens
        sketch: {
          bg: "#F8F9FA",
          sidebar: "#F2F3F4",
          card: "#FFFFFF",
          surface: "#F6F7F8",
          text: "#34383D",
          secondary: "#858B93",
          muted: "#A4A9AF",
          border: "#E5E7E9",
          active: "#E5E7E9",
          btn: "#E3E5E8",
          icon: "#777E86",
        },
        // FlowFest Retro Festival Tokens
        cream: {
          DEFAULT: "#F3ECD2",
          plus: "#FFFEFB",
        },
        ink: "#121212",
        retro: {
          pink: "#F489A3",
          mango: "#F3A20F",
          orange: "#F97028",
          yellow: "#F0BB0D",
        },
      },
      fontFamily: {
        peachy: ['"Sugar Peachy"', "Impact", "sans-serif"],
        quicksand: ["Quicksand", "system-ui", "sans-serif"],
        sans: ["var(--font-manrope)", "var(--font-inter)", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        "brutal-btn": "0 4px 0 0 #121212",
        "brutal-btn-hover": "0 2px 0 0 #121212",
        "brutal-card": "5px 5px 0 0 #121212",
        "brutal-badge": "2px 2px 0 0 #121212",
        "brutal-flat": "3px 3px 0 0 #121212",
        subtle: "0 1px 2px rgba(0,0,0,0.02)",
        card: "0 1px 3px rgba(0,0,0,0.02), 0 1px 2px rgba(0,0,0,0.02)",
        elevated: "0 4px 12px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)",
        xs: "0 1px 2px rgba(0,0,0,0.02)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        "2xl": "14px",
        "3xl": "18px",
        "4xl": "22px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
