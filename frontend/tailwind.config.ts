import type { Config } from "tailwindcss";

// Design tokens are mirrored 1:1 from the original Claude design export
// (design/ReplyMind.dc.html :root block). See ARCHITECTURE.md#design-tokens.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        "ink-soft": "var(--color-ink-soft)",
        primary: "var(--color-primary)",
        "primary-light": "var(--color-primary-light)",
        violet: "var(--color-violet)",
        cyan: "var(--color-cyan)",
        teal: "var(--color-teal)",
        amber: "var(--color-amber)",
        coral: "var(--color-coral)",
        surface: "var(--color-surface)",
        "surface-glass": "var(--color-surface-glass)",
        border: "var(--color-border)",
        "border-glass": "var(--color-border-glass)",
        bg: "var(--color-bg)",
        "text-primary": "var(--color-text-primary)",
        "text-secondary": "var(--color-text-secondary)",
        "text-muted": "var(--color-text-muted)",
        "text-on-dark": "var(--color-text-on-dark)",
        "text-on-dark-muted": "var(--color-text-on-dark-muted)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["General Sans", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
      },
      backgroundImage: {
        "gradient-brand": "var(--gradient-brand)",
        "gradient-mesh-bg": "var(--gradient-mesh-bg)",
      },
      keyframes: {
        "rm-floatA": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        "rm-floatB": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "rm-floatC": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        "rm-slidein": {
          from: { opacity: "0", transform: "translateY(-14px) scale(.98)" },
          to: { opacity: "1", transform: "none" },
        },
        "rm-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(30,34,148,.35)" },
          "50%": { boxShadow: "0 0 0 8px rgba(30,34,148,0)" },
        },
        "rm-dot": {
          "0%, 100%": { opacity: ".35" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "rm-floatA": "rm-floatA 4s ease-in-out infinite",
        "rm-floatB": "rm-floatB 4.6s ease-in-out .5s infinite",
        "rm-floatC": "rm-floatC 4.2s ease-in-out .9s infinite",
        "rm-slidein": "rm-slidein .5s cubic-bezier(.22,1,.36,1) both",
        "rm-pulse": "rm-pulse 2s infinite",
        "rm-dot": "rm-dot 1s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
