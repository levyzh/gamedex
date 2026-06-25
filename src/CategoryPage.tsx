import { useState, useEffect } from "react";
import Icon from "../components/Icon";
import GameCard from "../components/GameCard";
import { BROWSE_SORTERS, FILTER_LABEL, FILTER_PARAM } from "../constants";
import { RAWG, RAWG_KEY, mapGame } from "../rawg";
import { display, useT } from "../theme";
import type { FilterOption, Game } from "../types";

export default function BrowsePage({ onOpen }: { onOpen: (g: Game) => void }) {
  const T = useT();
  const [options, setOptions] = useState<FilterOption[]>([]);            // all filter options: {type, value, name, count}
  const [selected, setSelected] = useState<FilterOption[]>([]);          // chosen filters: {type, value, name}
  const [filterSearch, setFilterSearch] = useState("");
  const [gameSearch, setGameSearch] = useState("");      // search games by name
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState("rank");

  const [games, setGames] = useState<Game[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load every available filter once: genres, parent platforms, and the most
  // popular tags (RAWG has thousands of tags in many languages, so we keep the
  // English ones with a decent game count and sort by popularity).
  useEffect(() => {
    const grab = (url: string) => fetch(url).then(r => r.json()).then(d => d.results || []).catch(() => []);
    Promise.all([
      grab(`${RAWG}/genres?key=${RAWG_KEY}`),
      grab(`${RAWG}/platforms/lists/parents?key=${RAWG_KEY}`),
      grab(`${RAWG}/tags?key=${RAWG_KEY}&page_size=40`),
      grab(`${RAWG}/tags?key=${RAWG_KEY}&page_size=40&page=2`),
    ]).then(([genres, platforms, tags1, tags2]) => {
      const g = genres.map((x: any) => ({ type: "genre", value: x.slug, name: x.name, count: x.games_count }));
      const p = platforms.map((x: any) => ({ type: "platform", value: String(x.id), name: x.name, count: x.games_count }));
      const seen = new Set();
      const t = [...tags1, ...tags2]
        .filter(x => x.language === "eng" && x.games_count > 100)
        .sort((a, b) => b.games_count - a.games_count)
        .filter(x => (seen.has(x.slug) ? false : seen.add(x.slug)))
        .map(x => ({ type: "tag", value: x.slug, name: x.name, count: x.games_count }));
      setOptions([...g, ...p, ...t]);
    });
  }, []);

  const buildQuery = (p: number) => {
    let qs = `ordering=${BROWSE_SORTERS[sort].ordering}&page_size=40&page=${p}`;
    if (debouncedSearch) qs += `&search=${encodeURIComponent(debouncedSearch)}`;
    Object.keys(FILTER_PARAM).forEach(type => {
      const vals = selected.filter(s => s.type === type).map(s => s.value);
      if (vals.length) qs += `&${FILTER_PARAM[type]}=${vals.join(",")}`;
    });
    return qs;
  };

  // RAWG ORs multiple values within one param, so a game only needs to match ONE
  // of several genres/tags to come back. We tighten that to AND: a game must carry
  // EVERY selected filter to be kept.
  const matchesAll = (g: Game) => selected.every(s =>
    s.type === "genre"    ? g.genreSlugs.includes(s.value)
    : s.type === "tag"    ? g.tagSlugs.includes(s.value)
    : s.type === "platform" ? g.platformIds.includes(s.value)
    : true
  );

  // Because AND-filtering can thin out a page to almost nothing, scan forward a
  // few pages until we've gathered enough matches (or run out of results).
  const MAX_SCAN = 5, TARGET = 12;
  const fetchMatches = async (startPage: number) => {
    let p = startPage, collected: Game[] = [], next = true, scanned = 0;
    while (next && scanned < MAX_SCAN && collected.length < TARGET) {
      const res = await fetch(`${RAWG}/games?key=${RAWG_KEY}&${buildQuery(p)}`);
      if (!res.ok) throw new Error("RAWG responded with " + res.status);
      const d = await res.json();
      collected = collected.concat((d.results || []).map(mapGame).filter(matchesAll));
      next = !!d.next; p += 1; scanned += 1;
    }
    return { matches: collected, lastPage: p - 1, hasNext: next };
  };

  // Debounce the game-name search so we don't fire a request on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(gameSearch.trim()), 400);
    return () => clearTimeout(t);
  }, [gameSearch]);

  // Re-fetch whenever the chosen filters or sort change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setError(null); setGames([]); setPage(1);
    (async () => {
      try {
        const { matches, lastPage, hasNext } = await fetchMatches(1);
        if (cancelled) return;
        setGames(matches); setPage(lastPage); setHasNext(hasNext); setLoading(false);
      } catch (e) {
        if (!cancelled) { setError((e as Error).message); setLoading(false); }
      }
    })();
    return () => { cancelled = true; };
  }, [selected, sort, debouncedSearch]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { matches, lastPage, hasNext } = await fetchMatches(page + 1);
      setGames(prev => {
        const seen = new Set(prev.map(g => g.id));
        return [...prev, ...matches.filter(g => !seen.has(g.id))];
      });
      setPage(lastPage); setHasNext(hasNext);
    } catch { /* keep what we have */ }
    setLoadingMore(false);
  };

  const isSelected = (o: FilterOption) => selected.some(s => s.type === o.type && s.value === o.value);
  const addFilter = (o: FilterOption) => { if (!isSelected(o)) setSelected(prev => [...prev, { type: o.type, value: o.value, name: o.name }]); setFilterSearch(""); };
  const removeFilter = (s: FilterOption) => setSelected(prev => prev.filter(x => !(x.type === s.type && x.value === s.value)));

  // Only surface filter options while the user is typing in the filter box —
  // keeps the page compact instead of showing a permanent wall of chips.
  const fq = filterSearch.trim().toLowerCase();
  const addable = fq
    ? options.filter(o => o.name.toLowerCase().includes(fq)).filter(o => !isSelected(o)).slice(0, 24)
    : [];

  return (
    <div style={{ paddingTop: 22 }}>
      {/* Title + sort */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: display, fontWeight: 700, fontSize: 22, color: T.text, letterSpacing: "-0.02em" }}>Browse Games</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, color: T.metaDim, fontWeight: 500 }}>Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.borderH}`, background: T.surface, color: T.text, fontSize: 12.5, fontWeight: 500, cursor: "pointer", colorScheme: T.scheme }}>
            {Object.entries(BROWSE_SORTERS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      {/* Compact controls: search games + add filter, side by side */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16 }}>
        <div style={{ position: "relative", flex: "1 1 260px", minWidth: 0 }}>
          <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", display: "flex", color: T.metaDim }}><Icon name="search" size={14} /></span>
          <input
            value={gameSearch}
            onChange={(e) => setGameSearch(e.target.value)}
            placeholder="Search games by name…"
            style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: 9, border: `1px solid ${T.borderH}`, background: T.surface, fontSize: 12.5, color: T.text, outline: "none", colorScheme: T.scheme }}
          />
        </div>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 0 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.metaDim, fontSize: 16, lineHeight: 1 }}>+</span>
          <input
            value={filterSearch}
            onChange={(e) => setFilterSearch(e.target.value)}
            placeholder="Add filter: genre, platform, tag…"
            style={{ width: "100%", padding: "8px 12px 8px 28px", borderRadius: 9, border: `1px solid ${T.borderH}`, background: T.surface, fontSize: 12.5, color: T.text, outline: "none", colorScheme: T.scheme }}
          />
          {fq && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20, background: T.surface, border: `1px solid ${T.borderH}`, borderRadius: 10, boxShadow: T.shadowH, padding: 6, maxHeight: 264, overflowY: "auto" }}>
              {addable.length ? addable.map(o => (
                <button key={`${o.type}:${o.value}`} onClick={() => addFilter(o)}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.cardH}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5, fontWeight: 500, padding: "7px 10px", borderRadius: 7, cursor: "pointer", background: "transparent", color: T.text, border: "none", textAlign: "left" }}>
                  <span>{o.name}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase", color: T.metaDim }}>{FILTER_LABEL[o.type]}</span>
                </button>
              )) : (
                <div style={{ fontSize: 12, color: T.metaDim, padding: "8px 10px" }}>
                  {options.length ? `No filters match “${filterSearch}”.` : "Loading filters…"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active filters */}
      {selected.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, alignItems: "center" }}>
          {selected.map(s => (
            <button key={`${s.type}:${s.value}`} onClick={() => removeFilter(s)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, padding: "5px 10px 5px 13px", borderRadius: 999, cursor: "pointer", background: T.accent, color: "#fff", border: `1px solid ${T.accent}` }}>
              {s.name} <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.85 }}>×</span>
            </button>
          ))}
          <button onClick={() => setSelected([])}
            style={{ fontSize: 12, fontWeight: 500, color: T.link, background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>
            Clear all
          </button>
        </div>
      )}

      {/* Results */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, color: T.meta, fontSize: 14, padding: "50px 0" }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: "gv-spin 0.8s linear infinite" }} />
          Loading…
        </div>
      ) : error ? (
        <div style={{ color: T.meta, fontSize: 13, padding: "40px 0" }}>Couldn't load games: {error}.</div>
      ) : games.length ? (
        <>
          <div style={{ fontSize: 12, color: T.metaDim, margin: "22px 0 14px" }}>
            {games.length} loaded{selected.length ? ` · ${selected.map(s => s.name).join(", ")}` : ""}
          </div>
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
      ) : (
        <div style={{ color: T.meta, fontSize: 13, padding: "40px 0" }}>No games match these filters.</div>
      )}
    </div>
  );
}
