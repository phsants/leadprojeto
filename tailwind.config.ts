import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef7f6",
          100: "#d5ece9",
          200: "#aed9d4",
          300: "#7cbfba",
          400: "#4fa39e",
          500: "#348783",
          600: "#286c6a",
          700: "#235755",
          800: "#204645",
          900: "#1d3b3a",
          950: "#0d2221",
        },
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d4d9e3",
          300: "#aeb7c9",
          400: "#8290aa",
          500: "#61708c",
          600: "#4c5972",
          700: "#3e485d",
          800: "#363e4f",
          900: "#303645",
          950: "#1c202a",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(16,24,40,0.04), 0 8px 24px -8px rgba(16,24,40,0.10)",
        card: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
