import GameCard from "./GameCard";
import { display, useT } from "./theme";
import type { Game, ProfileSummary } from "./types";

// ─── Search results (games from RAWG + people from our own database) ───────────
export default function SearchResults({ query, results, loading, error, onOpen, people, onOpenUser }: { query: string; results: Game[]; loading: boolean; error: string | null; onOpen: (g: Game) => void; people: ProfileSummary[]; onOpenUser: (userId: string) => void }) {
  const T = useT();
  return (
    <div style={{ paddingTop: 22 }}>
      <h1 style={{ fontFamily: display, fontWeight: 700, fontSize: 22, color: T.text, letterSpacing: "-0.02em" }}>
        Search results for “{query}”
      </h1>

      {/* People first, when any match — a thin strip of chips, so games
          (the common search) still dominate the page. */}
      {people.length > 0 && (
        <div style={{ margin: "16px 0 4px" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: T.meta, textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 8 }}>
            People
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {people.map(person => (
              <button
                key={person.id}
                onClick={() => onOpenUser(person.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  background: T.surface, border: `1px solid ${T.border}`,
                  borderRadius: 999, padding: "5px 13px 5px 6px", cursor: "pointer",
                }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: "50%", overflow: "hidden", flexShrink: 0,
                  background: T.accentSoft, color: T.accent,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: display, fontWeight: 700, fontSize: 11,
                }}>
                  {person.avatarUrl
                    ? <img src={person.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    : person.username.charAt(0).toUpperCase()}
                </span>
                <span style={{ fontWeight: 600, fontSize: 12.5, color: T.text }}>{person.username}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.meta, fontSize: 14, padding: "40px 0" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: "gdx-spin 0.8s linear infinite" }} />
          Searching RAWG…
        </div>
      ) : error ? (
        <div style={{ color: T.meta, fontSize: 13, padding: "30px 0" }}>Search failed: {error}.</div>
      ) : results.length ? (
        <>
          <div style={{ fontSize: 12, color: T.metaDim, margin: "14px 0" }}>{results.length} {results.length === 1 ? "result" : "results"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 20, paddingBottom: 20 }}>
            {results.map(game => <GameCard key={game.id} game={game} onOpen={onOpen} />)}
          </div>
        </>
      ) : (
        <div style={{ color: T.meta, fontSize: 13, padding: "30px 0" }}>No games found for “{query}”.</div>
      )}
    </div>
  );
}