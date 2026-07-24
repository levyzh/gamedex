import { useState, useEffect, type CSSProperties } from "react";
import Icon from "../components/ui/Icon";
import SectionHeader from "../components/ui/SectionHeader";
import Info from "../components/ui/Info";
import Stat from "../components/ui/Stat";
import { STATUSES } from "../lib/constants";
import { RAWG, RAWG_KEY, coverBg, fmt, members } from "../api/rawg";
import { display, useT } from "../lib/theme";
import type { Entry, Game } from "../lib/types";
import CommentSection from "../components/CommentSection";

// ─── Detail page ───────────────────────────────────────────────────────────────
// myUserId + onRequireLogin exist for the comment section: who is
// logged in (null = nobody), and how to open the login form when a
// logged-out visitor tries to join the discussion.
export default function DetailPage({ game, entry, games, onBack, onSave, onRemove, myUserId, onRequireLogin, onOpenUser }: { game: Game; entry?: Entry; games: Game[]; onBack: () => void; onSave: (e: Entry) => void; onRemove: (id: number) => void; myUserId: string | null; onRequireLogin: () => void; onOpenUser: (userId: string) => void }) {
  const T = useT();
  const [status, setStatus] = useState(entry?.status || "Plan to Play");
  const [score, setScore] = useState(entry?.score ?? 0);
  const [hours, setHours] = useState(entry?.hours ?? 0);

  // The synopsis and developer aren't in the list data, so fetch the full
  // record for this game here.
  const [extra, setExtra] = useState({ dev: "", synopsis: "", loading: true });

  const field: CSSProperties = { width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 8, border: `1px solid ${T.borderH}`, fontSize: 13, color: T.text, background: T.surface, colorScheme: T.scheme };

  useEffect(() => {
    let cancelled = false;
    setExtra({ dev: "", synopsis: "", loading: true });

    fetch(`${RAWG}/games/${game.id}?key=${RAWG_KEY}`)
      .then(response => response.json())
      .then(data => {
        if (cancelled) return;
        setExtra({
          dev: data.developers?.[0]?.name || "Unknown",
          synopsis: data.description_raw || "No description available for this game.",
          loading: false,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setExtra({ dev: "Unknown", synopsis: "Couldn't load the description.", loading: false });
        }
      });

    return () => { cancelled = true; };
  }, [game.id]);

  // Rank this game against the others currently loaded, best score first.
  const ranked = games.slice().sort((a, b) => b.score - a.score);
  const rankIndex = ranked.findIndex(other => other.id === game.id);
  const rankLabel = rankIndex >= 0 ? "#" + (rankIndex + 1) : "—";

  return (
    <div>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: T.meta, fontSize: 13, cursor: "pointer", padding: "16px 0 8px" }}>
        <Icon name="back" size={15} /> Back
      </button>

      <div className="gdx-detail" style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 28, alignItems: "start", paddingBottom: 40 }}>
        {/* Left column */}
        <div>
          <div style={{ aspectRatio: "3/4", ...coverBg(game), borderRadius: 12, border: `1px solid ${T.border}` }} />

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, marginTop: 16, padding: 16 }}>
            <div style={{ fontFamily: display, fontWeight: 600, fontSize: 13, color: T.text, marginBottom: 12 }}>Add to my list</div>

            <label style={{ fontSize: 11, color: T.meta, fontWeight: 500 }}>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ ...field, marginBottom: 12 }}>
              {STATUSES.map(statusName => <option key={statusName}>{statusName}</option>)}
            </select>

            <label style={{ fontSize: 11, color: T.meta, fontWeight: 500 }}>Your score</label>
            <select value={score} onChange={(e) => setScore(Number(e.target.value))} style={{ ...field, marginBottom: 12 }}>
              <option value={0}>— Select —</option>
              {Array.from({ length: 10 }, (_, i) => 10 - i).map(n => <option key={n} value={n}>{n}</option>)}
            </select>

            <label style={{ fontSize: 11, color: T.meta, fontWeight: 500 }}>Hours played</label>
            <input type="number" min={0} value={hours} onChange={(e) => setHours(Number(e.target.value))} style={{ ...field, marginBottom: 16 }} />

            <button onClick={() => onSave({ gameId: game.id, status, score, hours, game })}
              style={{ width: "100%", padding: "9px 0", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
              {entry ? "Update entry" : "Add to list"}
            </button>
            {entry && (
              <button onClick={() => onRemove(game.id)}
                style={{ width: "100%", marginTop: 8, padding: "8px 0", borderRadius: 8, border: `1px solid ${T.borderH}`, background: T.surface, color: "#F87171", fontWeight: 500, fontSize: 12.5, cursor: "pointer" }}>
                Remove from list
              </button>
            )}
          </div>

          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, marginTop: 16, padding: 16, fontSize: 12.5 }}>
            <Info label="Developer" value={extra.loading ? "…" : extra.dev} />
            <Info label="Released" value={game.year} />
            <Info label="Genres" value={game.genre.join(", ")} />
            <Info label="Members" value={fmt(members(game))} last />
          </div>
        </div>

        {/* Right column */}
        <div>
          <h1 style={{ fontFamily: display, fontWeight: 700, fontSize: 28, color: T.text, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{game.title}</h1>
          <div style={{ color: T.meta, fontSize: 13, marginTop: 6 }}>{extra.loading ? "…" : extra.dev} · {game.year}</div>

          <div style={{ display: "flex", gap: 20, marginTop: 18, paddingBottom: 18, borderBottom: `1px solid ${T.border}` }}>
            <Stat icon="star" label="Score" value={game.score.toFixed(2)} />
            <Stat label="Rank" value={rankLabel} />
            <Stat label="Members" value={fmt(members(game))} />
          </div>

          <SectionHeader title="Synopsis" />
          <p style={{ color: extra.loading ? T.metaDim : T.textBody, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-line" }}>
            {extra.loading ? "Loading description…" : extra.synopsis}
          </p>

          <SectionHeader title="Genres" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {game.genre.map(genre => (
              <span key={genre} style={{ fontSize: 12, color: T.text, background: T.cardH, border: `1px solid ${T.border}`, borderRadius: 999, padding: "5px 12px" }}>{genre}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Community comments ──────────────────────────────────────── */}
      <CommentSection gameId={game.id} myUserId={myUserId} onRequireLogin={onRequireLogin} onOpenUser={onOpenUser} />
    </div>
  );
}