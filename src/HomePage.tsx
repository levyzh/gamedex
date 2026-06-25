import { useState, useEffect } from "react";
import Icon from "../components/Icon";
import GameCard from "../components/GameCard";
import { CATEGORY, RAWG, RAWG_KEY, mapGame } from "../rawg";
import { display, useT } from "../theme";
import type { Game } from "../types";

// ─── Category page ("View More" → Browse-style grid with pagination) ───────────
export default function CategoryPage({ categoryKey, onBack, onOpen }: { categoryKey: string; onBack: () => void; onOpen: (g: Game) => void }) {
  const T = useT();
  const cat = CATEGORY[categoryKey];
  const [games, setGames] = useState<Game[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNext, setHasNext] = useState(false);

  const fetchPage = (p: number) =>
    fetch(`${RAWG}/games?key=${RAWG_KEY}&${cat.query()}&page_size=40&page=${p}`)
      .then(r => { if (!r.ok) throw new Error("RAWG responded with " + r.status); return r.json(); });

  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setGames([]); setPage(1);
    fetchPage(1)
      .then(d => { if (cancelled) return; const mapped: Game[] = (d.results || []).map(mapGame); setGames(cat.refine ? cat.refine(mapped) : mapped); setHasNext(!!d.next); setLoading(false); })
      .catch(e => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [categoryKey]);

  const loadMore = () => {
    const next = page + 1;
    setLoadingMore(true);
    fetchPage(next)
      .then(d => {
        const mapped: Game[] = (d.results || []).map(mapGame);
        setGames(prev => {
          const seen = new Set(prev.map(g => g.id));
          const merged = [...prev, ...mapped.filter(g => !seen.has(g.id))];
          return cat.refine ? cat.refine(merged) : merged;
        });
        setHasNext(!!d.next);
        setPage(next);
        setLoadingMore(false);
      })
      .catch(() => setLoadingMore(false));
  };

  return (
    <div style={{ paddingTop: 8 }}>
      <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", color: T.meta, fontSize: 13, cursor: "pointer", padding: "16px 0 8px" }}>
        <Icon name="back" size={15} /> Back
      </button>
      <h1 style={{ fontFamily: display, fontWeight: 700, fontSize: 22, color: T.text, letterSpacing: "-0.02em" }}>{cat.title}</h1>

      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.meta, fontSize: 14, padding: "50px 0" }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: "gv-spin 0.8s linear infinite" }} />
          Loading…
        </div>
      ) : error ? (
        <div style={{ color: T.meta, fontSize: 13, padding: "40px 0" }}>Couldn't load this category: {error}.</div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: T.metaDim, margin: "16px 0 14px" }}>{games.length} loaded</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 20 }}>
            {games.map(g => <GameCard key={g.id} game={g} onOpen={onOpen} />)}
          </div>
          {hasNext && (
            <div style={{ textAlign: "center", padding: "28px 0 8px" }}>
              <button onClick={loadMore} disabled={loadingMore}
                style={{ padding: "10px 24px", borderRadius: 9, border: `1px solid ${T.borderH}`, background: T.surface, color: T.text, fontWeight: 600, fontSize: 13, cursor: loadingMore ? "default" : "pointer", opacity: loadingMore ? 0.6 : 1 }}>
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
