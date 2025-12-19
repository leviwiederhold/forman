import type { Config } from "tailwindcss";

const config: Config = {
darkMode: ["class", ".dark"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-quicksand)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
