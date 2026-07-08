import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff4ee",
          100: "#ffe6d8",
          400: "#ff9a63",
          500: "#f97a3d",
          600: "#e35e21",
          700: "#bc4718",
        },
      },
    },
  },
  plugins: [],
};

export default config;
