import { useContext, createContext, type CSSProperties } from "react";

// ─── Themes (dark default + light) ─────────────────────────────────────────────
export const THEMES = {
  dark: {
    bg: "#000000", surface: "#121214", panel: "#121214", card: "#121214", cardH: "#1B1B20",
    accent: "#818CF8", accentSoft: "rgba(129,140,248,0.14)", link: "#818CF8", nav: "#818CF8",
    text: "#F4F4F5", textBody: "#C9CCD2", meta: "#9CA0A8", metaDim: "#5C606A", rank: "#3A3D44",
    border: "rgba(255,255,255,0.09)", borderH: "rgba(255,255,255,0.18)", btn: "#1B1B20",
    chipBg: "rgba(255,255,255,0.05)", headerBg: "rgba(0,0,0,0.72)",
    shadow: "0 1px 2px rgba(0,0,0,0.4)", shadowH: "0 12px 28px rgba(0,0,0,0.55)", scheme: "dark",
  },
  light: {
    bg: "#FBFBFA", surface: "#FFFFFF", panel: "#FFFFFF", card: "#FFFFFF", cardH: "#F6F6F5",
    accent: "#4F46E5", accentSoft: "rgba(79,70,229,0.08)", link: "#4F46E5", nav: "#4F46E5",
    text: "#16161A", textBody: "#3A3D44", meta: "#6E7178", metaDim: "#A1A4AB", rank: "#C2C5CC",
    border: "rgba(17,17,17,0.08)", borderH: "rgba(17,17,17,0.14)", btn: "#FFFFFF",
    chipBg: "rgba(0,0,0,0.03)", headerBg: "rgba(255,255,255,0.85)",
    shadow: "0 1px 2px rgba(17,17,17,0.04)", shadowH: "0 10px 24px rgba(17,17,17,0.10)", scheme: "light",
  },
};

export const ThemeCtx = createContext(THEMES.dark);

export const useT = () => useContext(ThemeCtx);

export const display = "'Space Grotesk', sans-serif";

export const body = "'Inter', sans-serif";

export const clamp2: CSSProperties = {
  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  overflow: "hidden", textOverflow: "ellipsis",
};
