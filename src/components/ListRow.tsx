import { useState, useEffect, type CSSProperties } from "react";
import { STATUSES, STATUS_COLOR } from "../lib/constants";
import { coverBg } from "../api/rawg";
import { display, useT } from "../lib/theme";
import type { Entry, Game } from "../lib/types";

// One row — status, score, and hours are editable right here and save on change.
export default function ListRow({ index, game, entry, onOpen, onRemove, onSave }: { index: number; game: Game; entry: Entry; onOpen: (g: Game) => void; onRemove: (id: number) => void; onSave: (e: Entry) => void }) {
  const T = useT();
  const [status, setStatus] = useState(entry.status);
  const [score, setScore] = useState(entry.score || 0);
  const [hours, setHours] = useState(entry.hours || 0);
  const [confirming, setConfirming] = useState(false); // two-step remove confirm

  // Keep the local fields in sync if this entry changes elsewhere.
  useEffect(() => {
    setStatus(entry.status);
    setScore(entry.score || 0);
    setHours(entry.hours || 0);
  }, [entry.status, entry.score, entry.hours]);

  const commit = (next: Partial<Entry>) => onSave({
    gameId: game.id, game,
    status: next.status ?? status,
    score:  next.score  ?? score,
    hours:  next.hours  ?? hours,
  });

  const cell: CSSProperties = { padding: "10px 14px", fontSize: 13, color: T.text, borderTop: `1px solid ${T.border}`, verticalAlign: "middle" };
  const fieldBase = { borderRadius: 7, border: `1px solid ${T.border}`, background: T.surface, fontSize: 12.5, padding: "5px 8px", colorScheme: T.scheme, cursor: "pointer", outline: "none" };

  return (
    <tr onMouseLeave={() => setConfirming(false)}>
      <td style={{ ...cell, textAlign: "center", color: T.metaDim, fontFamily: display, fontVariantNumeric: "tabular-nums" }}>{index}</td>
      <td style={cell}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div onClick={() => onOpen(game)} style={{ width: 34, height: 47, ...coverBg(game), borderRadius: 5, cursor: "pointer", border: `1px solid ${T.border}`, flexShrink: 0 }} />
          <div onClick={() => onOpen(game)} style={{ cursor: "pointer" }}>
            <div style={{ fontWeight: 500, color: T.link }}>{game.title}</div>
            <div style={{ color: T.metaDim, fontSize: 11.5 }}>{game.genre[0]} · {game.year}</div>
          </div>
        </div>
      </td>
      <td style={cell}>
        <select value={status} onChange={(e) => { setStatus(e.target.value); commit({ status: e.target.value }); }}
          style={{ ...fieldBase, color: STATUS_COLOR[status], fontWeight: 500 }}>
          {STATUSES.map(statusName => <option key={statusName} value={statusName} style={{ color: T.text }}>{statusName}</option>)}
        </select>
      </td>
      <td style={{ ...cell, textAlign: "center" }}>
        <select value={score} onChange={(e) => { const v = Number(e.target.value); setScore(v); commit({ score: v }); }}
          style={{ ...fieldBase, fontFamily: display, fontWeight: 600, textAlign: "center" }}>
          <option value={0}>–</option>
          {Array.from({ length: 10 }, (_, i) => 10 - i).map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </td>
      <td style={{ ...cell, textAlign: "center" }}>
        <input type="number" min={0} value={hours}
          onChange={(e) => setHours(Number(e.target.value))}
          onBlur={() => commit({ hours })}
          style={{ ...fieldBase, width: 66, textAlign: "center", fontVariantNumeric: "tabular-nums", cursor: "text" }} />
      </td>
      <td style={{ ...cell, textAlign: "center" }}>
        {confirming ? (
          <button onClick={() => onRemove(game.id)} title="Click again to confirm"
            style={{ fontSize: 11.5, fontWeight: 600, color: "#fff", background: "#F87171", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
            Remove
          </button>
        ) : (
          <button onClick={() => setConfirming(true)} aria-label="Remove from list" title="Remove from list"
            style={{ background: "none", border: "none", color: T.metaDim, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>×</button>
        )}
      </td>
    </tr>
  );
}
