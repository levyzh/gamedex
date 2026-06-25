import { useState } from "react";
import Icon from "./Icon";
import { coverBg } from "./rawg";
import { clamp2, useT } from "./theme";
import type { Game } from "./types";

// ─── Card (main feed grid) ─────────────────────────────────────────────────────
export default function GameCard({ game, onOpen }: { game: Game; onOpen: (g: Game) => void }) {
  const T = useT();
  const [hover, setHover] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const blurred = game.adult && !revealed;

  // While blurred, the first click reveals the cover; once revealed it opens.
  const handleClick = () => {
    if (blurred) { setRevealed(true); return; }
    onOpen(game);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ cursor: "pointer", transition: "transform 0.14s" }}
    >
      <div style={{
        aspectRatio: "3/4", borderRadius: 10, background: T.cardH,
        border: `1px solid ${T.border}`, transform: hover ? "translateY(-3px)" : "none",
        boxShadow: hover ? T.shadowH : T.shadow,
        transition: "all 0.16s", position: "relative", overflow: "hidden",
      }}>
        {/* Cover image layer — blurred while an adult game is hidden */}
        <div style={{
          position: "absolute", inset: 0, ...coverBg(game),
          filter: blurred ? "blur(18px)" : "none",
          transform: blurred ? "scale(1.15)" : "none", // hide blur bleed at the edges
          transition: "filter 0.2s, transform 0.2s",
        }} />

        {/* Score badge — hidden while the cover is blurred */}
        {!blurred && (
          <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(255,255,255,0.92)", color: "#16161A", fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 999, display: "flex", alignItems: "center", gap: 3 }}>
            <Icon name="star" size={11} color="#4F46E5" /> {game.score.toFixed(2)}
          </div>
        )}

        {/* Adult-content warning overlay */}
        {blurred && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 4, textAlign: "center",
            padding: 12, background: "rgba(0,0,0,0.55)", color: "#fff",
          }}>
            <div style={{ fontSize: 24, lineHeight: 1 }}>🔞</div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Adult content</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Click to reveal</div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 8, color: blurred ? T.metaDim : T.text, fontWeight: 500, fontSize: 13, lineHeight: 1.3, ...clamp2 }}>
        {blurred ? "Hidden — adult content" : game.title}
      </div>
      <div style={{ color: T.metaDim, fontSize: 11.5, marginTop: 2 }}>{game.genre[0]} · {game.year}</div>
    </div>
  );
}
