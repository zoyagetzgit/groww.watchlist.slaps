import type { Config } from "tailwindcss";

// Groww's actual published tokens (their real DESIGN.md, per public design-token
// trackers): text/primary #44475b, accent #04b488, border #f0f0f2, white surface.
// I've filled in the gaps they don't publish (a negative-red, an "insight" color
// for things that AREN'T a buy/sell signal) using the same restrained, low-
// saturation logic as the rest of their palette, instead of grabbing a generic
// Tailwind red/blue off the shelf.
//
// The one deliberate improvement over their actual app: Groww uses green/red
// for literally everything semantic (price, score, alerts), which means an
// "attention" flag and a "price is down" flag look the same at a glance. Here,
// green/red is reserved ONLY for price direction. Everything else (MCS score,
// confidence, catalysts) uses the indigo "insight" tone, so the two kinds of
// information don't visually compete.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#FFFFFF",
        surfaceMuted: "#F7F7F9",
        border: "#F0F0F2",
        ink: "#44475B",       // Groww's actual text/primary token
        inkMuted: "#8B8D9B",
        brand: "#04B488",     // Groww's actual accent token
        brandSoft: "#E3F6F1",
        up: "#04B488",
        upSoft: "#E3F6F1",
        down: "#EB5B3C",
        downSoft: "#FDECE7",
        insight: "#5B5FEF",
        insightSoft: "#EDEDFC",
        stale: "#8B8D9B",
        staleSoft: "#F0F0F2",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        pill: "999px",
      },
      boxShadow: {
        row: "0 1px 2px rgba(68, 71, 91, 0.04)",
      },
    },
  },
  plugins: [],
};
export default config;
