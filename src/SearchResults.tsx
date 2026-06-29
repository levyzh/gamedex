import GameCard from "./GameCard";
import { RAWG } from "./rawg";
import { display, useT } from "./theme";
import type { Game } from "./types";

// ─── Search results (server-side, full RAWG catalog) ───────────────────────────
export default function SearchResults({ query, results, loading, error, onOpen }: { query: string; results: Game[]; loading: boolean; error: string | null; onOpen: (g: Game) => void }) {
  const T = useT();
  return (
    <div style={{ paddingTop: 22 }}>
      <h1 style={{ fontFamily: display, fontWeight: 700, fontSize: 22, color: T.text, letterSpacing: "-0.02em" }}>
        Search results for “{query}”
      </h1>
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.meta, fontSize: 14, padding: "40px 0" }}>
          <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: "gv-spin 0.8s linear infinite" }} />
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
