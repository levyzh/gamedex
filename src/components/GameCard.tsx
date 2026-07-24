import { useState, type CSSProperties } from "react";
import Icon from "./ui/Icon";
import { coverBg } from "../api/rawg";
import { clamp2, useT } from "../lib/theme";
import type { Game } from "../lib/types";

// ─── Card (main feed grid) ─────────────────────────────────────────────────────
export default function GameCard({ game, onOpen }: { game: Game; onOpen: (g: Game) => void }) {
  const T = useT();
  const [hover, setHover] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Adult games start blurred. The first click reveals the cover; the next opens it.
  const blurred = game.adult && !revealed;

  const handleClick = () => {
    if (blurred) {
      setRevealed(true);
      return;
    }
    onOpen(game);
  };

  // All styling lives here, named, so the JSX below reads as pure structure.
  const styles: Record<string, CSSProperties> = {
    wrapper: {
      cursor: "pointer",
      transition: "transform 0.14s",
    },
    card: {
      aspectRatio: "3/4",
      borderRadius: 10,
      background: T.cardH,
      border: `1px solid ${T.border}`,
      transform: hover ? "translateY(-3px)" : "none",
      boxShadow: hover ? T.shadowH : T.shadow,
      transition: "all 0.16s",
      position: "relative",
      overflow: "hidden",
    },
    cover: {
      position: "absolute",
      inset: 0,
      ...coverBg(game),
      filter: blurred ? "blur(18px)" : "none",
      transform: blurred ? "scale(1.15)" : "none", // hide blur bleed at the edges
      transition: "filter 0.2s, transform 0.2s",
    },
    scoreBadge: {
      position: "absolute",
      top: 8,
      left: 8,
      background: "rgba(255,255,255,0.92)",
      color: "#16161A",
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 7px",
      borderRadius: 999,
      display: "flex",
      alignItems: "center",
      gap: 3,
    },
    adultOverlay: {
      position: "absolute",
      inset: 0,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      textAlign: "center",
      padding: 12,
      background: "rgba(0,0,0,0.55)",
      color: "#fff",
    },
    title: {
      marginTop: 8,
      color: blurred ? T.metaDim : T.text,
      fontWeight: 500,
      fontSize: 13,
      lineHeight: 1.3,
      ...clamp2,
    },
    meta: {
      color: T.metaDim,
      fontSize: 11.5,
      marginTop: 2,
    },
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={styles.wrapper}
    >
      <div style={styles.card}>
        {/* Cover image — blurred while an adult game is hidden */}
        <div style={styles.cover} />

        {/* Score badge — hidden while the cover is blurred */}
        {!blurred && (
          <div style={styles.scoreBadge}>
            <Icon name="star" size={11} color="#4F46E5" /> {game.score.toFixed(2)}
          </div>
        )}

        {/* Adult-content warning overlay */}
        {blurred && (
          <div style={styles.adultOverlay}>
            <div style={{ fontSize: 24, lineHeight: 1 }}>🔞</div>
            <div style={{ fontSize: 12.5, fontWeight: 600 }}>Adult content</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Click to reveal</div>
          </div>
        )}
      </div>

      <div style={styles.title}>
        {blurred ? "Hidden — adult content" : game.title}
      </div>
      <div style={styles.meta}>
        {game.genre[0]} · {game.year}
      </div>
    </div>
  );
}
