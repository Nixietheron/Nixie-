import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        anime: ["var(--font-anime)", "ui-rounded", "sans-serif"],
      },
      colors: {
        background: "#0f0d14",
        foreground: "#e8e4f0",
        nixie: {
          primary: "#D7FF00",
          secondary: "#EFFF8A",
          card: "#16131f",
          background: "#0f0d14",
          accent: "#B8A9C9",
          foreground: "#e8e4f0",
          muted: "#a89bb8",
        },
        anime: {
          lime: "#D7FF00",
          lavender: "#B8A9C9",
          violet: "#7B68C0",
          cyan: "#6EC5E8",
          night: "#0f0d14",
          "night-card": "#16131f",
          foreground: "#4a3540",
        },
      },
      boxShadow: {
        "anime-glow": "0 0 20px rgba(215, 255, 0, 0.25), 0 0 40px rgba(239, 255, 138, 0.1)",
        "anime-soft": "0 4px 24px rgba(215, 255, 0, 0.15)",
        "anime-card": "0 8px 32px rgba(15, 13, 20, 0.4)",
      },
      backgroundImage: {
        "anime-gradient": "linear-gradient(135deg, #D7FF00 0%, #EFFF8A 35%, #F4FFD1 70%, #F8FFE5 100%)",
        "anime-dark": "linear-gradient(180deg, #0f0d14 0%, #16131f 50%, #0f0d14 100%)",
      },
    },
  },
  plugins: [],
};
export default config;
