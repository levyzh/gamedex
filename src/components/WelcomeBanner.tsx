import { useState } from "react";
import { display, useT } from "../lib/theme";

// ─── Welcome banner (dismissible) ──────────────────────────────────────────────
export default function WelcomeBanner({ onDismiss }: { onDismiss: () => void }) {
  const T = useT();
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", overflow: "hidden",
        background: T.accentSoft, borderLeft: `3px solid ${T.nav}`, padding: "14px 18px",
        color: T.text, borderRadius: 10, marginBottom: 4,
        animation: "gdx-banner-in 0.45s ease both",
      }}
    >
      <div style={{ fontFamily: display, fontWeight: 600, fontSize: 17, letterSpacing: "-0.01em" }}>Welcome to Gamedex</div>
      <div style={{ color: T.meta, fontSize: 13, marginTop: 3, paddingRight: 22 }}>Track what you play, rate it, and log your hours — your library, your way.</div>
      <button
        onClick={onDismiss}
        aria-label="Hide welcome banner"
        style={{
          position: "absolute", top: 9, right: 9, width: 24, height: 24, borderRadius: 6,
          border: "none", background: hover ? T.chipBg : "transparent", color: T.meta,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 17, lineHeight: 1, opacity: hover ? 1 : 0,
          transition: "opacity 0.16s, background 0.16s",
        }}
      >×</button>
    </div>
  );
}