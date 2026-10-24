import { useContext, createContext, type CSSProperties } from "react";

// ─── Themes (dark default + light) ─────────────────────────────────────────────
export const THEMES = {
  dark: {
    bg: "#000000", surface: "#121214", panel: "#121214", card: "#121214", cardH: "#1B1B20",
    accent: "#0A84FF", accentSoft: "rgba(10,132,255,0.15)", link: "#0A84FF", nav: "#0A84FF",
    text: "#F4F4F5", textBody: "#C9CCD2", meta: "#9CA0A8", metaDim: "#5C606A", rank: "#3A3D44",
    border: "rgba(255,255,255,0.09)", borderH: "rgba(255,255,255,0.18)", btn: "#1B1B20",
    chipBg: "rgba(255,255,255,0.05)", headerBg: "rgba(0,0,0,0.72)",
    shadow: "0 1px 2px rgba(0,0,0,0.4)", shadowH: "0 12px 28px rgba(0,0,0,0.55)", scheme: "dark",
  },
  light: {
    bg: "#FBFBFA", surface: "#FFFFFF", panel: "#FFFFFF", card: "#FFFFFF", cardH: "#F6F6F5",
    accent: "#0071E3", accentSoft: "rgba(0,113,227,0.08)", link: "#0066CC", nav: "#0066CC",
    text: "#16161A", textBody: "#3A3D44", meta: "#6E7178", metaDim: "#A1A4AB", rank: "#C2C5CC",
    border: "rgba(17,17,17,0.08)", borderH: "rgba(17,17,17,0.14)", btn: "#FFFFFF",
    chipBg: "rgba(0,0,0,0.03)", headerBg: "rgba(255,255,255,0.85)",
    shadow: "0 1px 2px rgba(17,17,17,0.04)", shadowH: "0 10px 24px rgba(17,17,17,0.10)", scheme: "light",
  },
};

export const ThemeCtx = createContext(THEMES.dark);

export const useT = () => useContext(ThemeCtx);

// SF Pro on Apple devices (it can't be shipped), Inter everywhere else.
// Inter must stay ahead of Segoe UI or Windows picks Segoe.
const APPLE_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", system-ui, sans-serif';

export const display = APPLE_FONT_STACK;

export const body = APPLE_FONT_STACK;

export const clamp2: CSSProperties = {
  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
  overflow: "hidden", textOverflow: "ellipsis",
};