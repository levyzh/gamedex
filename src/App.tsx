import "./styles";
import { useState, useMemo, useEffect } from "react";
import Icon from "./components/Icon";
import SidebarPanel from "./components/SidebarPanel";
import HomePage from "./pages/HomePage";
import BrowsePage from "./pages/BrowsePage";
import CategoryPage from "./pages/CategoryPage";
import DetailPage from "./pages/DetailPage";
import ListPage from "./pages/ListPage";
import SearchResults from "./pages/SearchResults";
import { CATEGORY, RAWG, RAWG_KEY, mapGame } from "./rawg";
import { THEMES, ThemeCtx, body, display } from "./theme";
import type { Entry, Game } from "./types";

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [dark, setDark] = useState(true);
  const T = dark ? THEMES.dark : THEMES.light;

  const [page, setPage] = useState("home");
  const [query, setQuery] = useState("");
  const [selGame, setSelGame] = useState<Game | null>(null); // full game object (works for catalog or search hits)
  const [category, setCategory] = useState<string | null>(null); // active "View More" category key
  const [userList, setUserList] = useState<Entry[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);

  // Live game data from RAWG — three distinct lists for the home feed
  const [feed, setFeed] = useState<{ popular: Game[]; fresh: Game[]; acclaimed: Game[]; topRated: Game[]; reviewed: Game[] }>({ popular: [], fresh: [], acclaimed: [], topRated: [], reviewed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-side search across RAWG's full catalog
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadGames = () => {
    setLoading(true);
    setError(null);
    const get = (qs: string) =>
      fetch(`${RAWG}/games?key=${RAWG_KEY}&${qs}`)
        .then(r => { if (!r.ok) throw new Error("RAWG responded with " + r.status); return r.json(); })
        .then(d => (d.results || []).map(mapGame));
    Promise.all([
      get(`${CATEGORY.popular.query()}&page_size=12`),
      get(`${CATEGORY.fresh.query()}&page_size=12`),
      get(`${CATEGORY.acclaimed.query()}&page_size=12`),
      get(`ordering=-added&page_size=40`), // shared pool of popular games for both sidebar lists
    ])
      .then(([popular, fresh, acclaimed, pool]) => {
        setFeed({
          popular, fresh, acclaimed,
          topRated: CATEGORY.topRated.refine?.(pool) || pool, // same pool, ranked by user rating
          reviewed: CATEGORY.reviewed.refine?.(pool) || pool, // same pool, ranked by review count
        });
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  };

  useEffect(() => { loadGames(); }, []);

  // Debounced search: wait until the user pauses typing, then ask RAWG to
  // search its entire database. AbortController cancels stale in-flight requests.
  useEffect(() => {
    const q = query.trim();
    if (!q) { setSearchResults([]); setSearching(false); setSearchError(null); return; }
    setSearching(true);
    setSearchError(null);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`${RAWG}/games?key=${RAWG_KEY}&search=${encodeURIComponent(q)}&page_size=40`, { signal: ctrl.signal })
        .then(r => { if (!r.ok) throw new Error("RAWG responded with " + r.status); return r.json(); })
        .then(data => { setSearchResults((data.results || []).map(mapGame)); setSearching(false); })
        .catch(e => { if (e.name !== "AbortError") { setSearchError(e.message); setSearching(false); } });
    }, 400);
    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [query]);

  useEffect(() => {
    if (typeof document !== "undefined") document.body.style.background = T.bg;
  }, [T.bg]);

  const listMap = useMemo(() => Object.fromEntries(userList.map(e => [e.gameId, e])), [userList]);

  // Combined, de-duplicated set of everything we've loaded (for Browse + rank lookups)
  const allGames = useMemo(() => {
    const m = new Map();
    [...feed.popular, ...feed.fresh, ...feed.acclaimed, ...feed.topRated, ...feed.reviewed].forEach(g => m.set(g.id, g));
    return [...m.values()];
  }, [feed]);

  const open = (g: Game) => { setSelGame(g); setPage("detail"); window.scrollTo(0, 0); };
  const openCategory = (key: string) => { setCategory(key); setPage("category"); window.scrollTo(0, 0); };
  const goHome = () => { setSelGame(null); setQuery(""); setPage("home"); };
  const goBack = () => { setSelGame(null); setPage(query.trim() ? page : "home"); };

  const saveEntry = (entry: Entry) => {
    setUserList(prev => {
      const without = prev.filter(e => e.gameId !== entry.gameId);
      return [...without, entry];
    });
  };
  const removeEntry = (id: number) => setUserList(prev => prev.filter(e => e.gameId !== id));

  const topRanked = feed.topRated.slice(0, 5);   // highest user rating among popular games
  const mostPopular = feed.reviewed.slice(0, 5);  // most reviewed of all time

  const NavLink = ({ name, target, icon }: { name: string; target: string; icon: string }) => {
    const active = page === target;
    return (
      <button
        onClick={() => { setSelGame(null); setQuery(""); setPage(target); }}
        style={{
          display: "flex", alignItems: "center", gap: 6, background: "none", border: "none",
          color: active ? T.text : T.meta, fontSize: 13.5, fontWeight: active ? 600 : 500,
          cursor: "pointer", padding: "4px 2px", position: "relative",
        }}
      >
        <Icon name={icon} size={16} color={active ? T.accent : T.meta} />
        {name}
        {active && <span style={{ position: "absolute", left: 0, right: 0, bottom: -15, height: 2, background: T.accent, borderRadius: 2 }} />}
      </button>
    );
  };

  return (
    <ThemeCtx.Provider value={T}>
      <div style={{ minHeight: "100vh", background: T.bg, fontFamily: body, color: T.text, colorScheme: T.scheme }}>
        {/* Header */}
        <header style={{ position: "sticky", top: 0, zIndex: 50, background: T.headerBg, backdropFilter: "blur(10px)", borderBottom: `1px solid ${T.border}` }}>
          <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", gap: 28 }}>
            <div onClick={goHome} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: T.accent, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: display, fontWeight: 700, fontSize: 13 }}>GV</div>
              <span style={{ fontFamily: display, fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: T.text }}>GameVault</span>
            </div>

            <nav style={{ display: "flex", alignItems: "center", gap: 22 }}>
              <NavLink name="Home" target="home" icon="home" />
              <NavLink name="Browse" target="browse" icon="grid" />
              <NavLink name="My List" target="list" icon="list" />
            </nav>

            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <span style={{ position: "absolute", left: 11, display: "flex", color: T.metaDim }}><Icon name="search" size={15} /></span>
                <input
                  value={query}
                  onChange={(e) => { const v = e.target.value; setQuery(v); if (v) { setSelGame(null); if (page === "detail") setPage("home"); } }}
                  placeholder="Search games"
                  style={{ width: 200, padding: "8px 12px 8px 34px", borderRadius: 9, border: `1px solid ${T.borderH}`, background: T.surface, fontSize: 13, color: T.text, outline: "none", colorScheme: T.scheme }}
                />
              </div>

              {/* Theme toggle — top-right corner */}
              <button
                onClick={() => setDark(d => !d)}
                title={dark ? "Switch to light mode" : "Switch to dark mode"}
                aria-label="Toggle theme"
                style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  border: `1px solid ${T.borderH}`, background: T.surface, color: T.text,
                  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                }}
              >
                <Icon name={dark ? "sun" : "moon"} size={17} color={T.text} />
              </button>
            </div>
          </div>
        </header>

        {/* Body */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 60px" }}>
          {(page === "detail" && selGame) ? (
            <DetailPage game={selGame} entry={listMap[selGame.id]} games={allGames} onBack={goBack} onSave={saveEntry} onRemove={removeEntry} />
          ) : query.trim() ? (
            <SearchResults query={query.trim()} results={searchResults} loading={searching} error={searchError} onOpen={open} />
          ) : page === "category" && category ? (
            <CategoryPage categoryKey={category} onBack={goHome} onOpen={open} />
          ) : loading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "120px 0", gap: 14 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", border: `3px solid ${T.border}`, borderTopColor: T.accent, animation: "gv-spin 0.8s linear infinite" }} />
              <div style={{ color: T.meta, fontSize: 14 }}>Loading games…</div>
            </div>
          ) : error ? (
            <div style={{ textAlign: "center", padding: "100px 0", maxWidth: 420, margin: "0 auto" }}>
              <div style={{ color: T.text, fontWeight: 600, fontSize: 16 }}>Couldn't load games</div>
              <div style={{ color: T.meta, fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
                {error}. Check your internet connection and that your RAWG API key is valid.
              </div>
              <button onClick={loadGames}
                style={{ marginTop: 18, padding: "9px 20px", borderRadius: 8, border: "none", background: T.accent, color: "#fff", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                Try again
              </button>
            </div>
          ) : page === "list" ? (
            <div style={{ paddingTop: 8 }}>
              <ListPage listMap={listMap} onOpen={open} onRemove={removeEntry} onSave={saveEntry} />
            </div>
          ) : page === "browse" ? (
            <BrowsePage onOpen={open} />
          ) : (
            <div className="gv-body" style={{ display: "flex", gap: 28, paddingTop: 22, alignItems: "flex-start" }}>
              <main style={{ flex: 1, minWidth: 0 }}>
                <HomePage popular={feed.popular} fresh={feed.fresh} acclaimed={feed.acclaimed} onOpen={open} onViewMore={openCategory} showWelcome={showWelcome} onDismissWelcome={() => setShowWelcome(false)} />
              </main>
              <aside className="gv-rail" style={{ width: 300, flexShrink: 0, position: "sticky", top: 80 }}>
                <SidebarPanel title="Top Ranked" games={topRanked} onOpen={open} onMore={() => openCategory("topRated")} />
                <SidebarPanel title="Most Popular" games={mostPopular} onOpen={open} onMore={() => openCategory("reviewed")} />
              </aside>
            </div>
          )}
        </div>

        {/* Attribution footer (required by RAWG's free terms) */}
        <footer style={{ borderTop: `1px solid ${T.border}`, padding: "20px 24px", textAlign: "center" }}>
          <span style={{ color: T.metaDim, fontSize: 12 }}>
            Game data by{" "}
            <a href="https://rawg.io" target="_blank" rel="noopener noreferrer" style={{ color: T.link, fontWeight: 500 }}>RAWG</a>
          </span>
        </footer>
      </div>
    </ThemeCtx.Provider>
  );
}
