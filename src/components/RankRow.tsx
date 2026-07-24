import { useState } from "react";
import Icon from "./ui/Icon";
import { coverBg, fmt, members } from "../api/rawg";
import { clamp2, display, useT } from "../lib/theme";
import type { Game } from "../lib/types";

// ─── Rank row (sidebar) ────────────────────────────────────────────────────────
export default function RankRow({ rank, game, onOpen }: { rank: number; game: Game; onOpen: (g: Game) => void }) {
  const T = useT();
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative", display: "grid", gridTemplateColumns: "26px 40px 1fr",
        gap: 10, padding: "10px 14px", alignItems: "center",
        borderTop: `1px solid ${T.border}`, background: hover ? T.cardH : "transparent",
        transition: "background 0.12s",
      }}
    >
      <span style={{
        fontFamily: display, fontSize: 16, fontWeight: 600, textAlign: "center",
        fontVariantNumeric: "tabular-nums",
        color: rank <= 3 ? T.accent : T.rank,
      }}>{rank}</span>
      <div onClick={() => onOpen(game)} style={{ width: 40, height: 56, ...coverBg(game), borderRadius: 5, cursor: "pointer", flexShrink: 0, border: `1px solid ${T.border}`, filter: game.adult ? "blur(7px)" : "none", overflow: "hidden" }} />
      <div style={{ minWidth: 0, paddingRight: 26 }}>
        <div onClick={() => onOpen(game)} style={{ color: T.text, fontWeight: 500, fontSize: 12.5, lineHeight: 1.3, cursor: "pointer", ...clamp2 }}>{game.adult ? "Hidden — adult content" : game.title}</div>
        <div style={{ color: T.meta, fontSize: 11, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="star" size={10} color={T.accent} /> {game.score.toFixed(2)}
          <span style={{ color: T.metaDim }}>· {game.year}</span>
        </div>
        <div style={{ color: T.metaDim, fontSize: 11, marginTop: 1 }}>{fmt(members(game))} members</div>
      </div>
      <button
        onClick={() => onOpen(game)}
        style={{
          position: "absolute", top: 11, right: 12, fontSize: 11, fontWeight: 500,
          color: T.link, background: T.btn, border: `1px solid ${T.borderH}`,
          borderRadius: 6, padding: "2px 9px", cursor: "pointer", lineHeight: 1.6,
        }}
      >add</button>
    </div>
  );
}
