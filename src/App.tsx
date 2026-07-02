import "./styles";
import { useState, useMemo, useEffect } from "react";
import Icon from "./Icon";
import SidebarPanel from "./SidebarPanel";
import HomePage from "./HomePage";
import BrowsePage from "./BrowsePage";
import CategoryPage from "./CategoryPage";
import DetailPage from "./DetailPage";
import ListPage from "./ListPage";
import ProfilePage from "./ProfilePage";
import SearchResults from "./SearchResults";
import { CATEGORY, RAWG, RAWG_KEY, mapGame } from "./rawg";
import { fetchList, postEntry, deleteEntry } from "./api";
import { THEMES, ThemeCtx, body, display } from "./theme";
import type { Entry, Game } from "./types";
// New for accounts: the session type from Supabase, our auth helpers,
// and the login/signup form we show when nobody is logged in.
import type { Session } from "@supabase/supabase-js";
import { watchSession, signOut } from "./auth";
import { AuthForm } from "./AuthForm";

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

  // Who is logged in? An object when someone is, null when nobody is.
  // Note the app is NOT gated on this anymore — anyone can browse. The
  // session only decides which header buttons you see and whether saves work.
  const [session, setSession] = useState<Session | null>(null);
  // On page load there's a brief moment before Supabase has told us the
  // answer. During it we show NEITHER "Log in" nor "Log out" in the
  // header, so a logged-in user never sees the wrong button flash by.
  const [checkingSession, setCheckingSession] = useState(true);

  // Is the login/signup modal open, and in which mode? null means closed.
  // Set to "signin" or "signup" by the header buttons (and by trying to
  // save a game while logged out).
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);

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

    // Fetch a RAWG games query and return the results mapped to our Game shape.
    const getGames = async (queryString: string): Promise<Game[]> => {
      const response = await fetch(`${RAWG}/games?key=${RAWG_KEY}&${queryString}`);
      if (!response.ok) {
        throw new Error("RAWG responded with " + response.status);
      }
      const data = await response.json();
      return (data.results || []).map(mapGame);
    };

    Promise.all([
      getGames(`${CATEGORY.popular.query()}&page_size=12`),
      getGames(`${CATEGORY.fresh.query()}&page_size=12`),
      getGames(`${CATEGORY.acclaimed.query()}&page_size=12`),
      getGames(`ordering=-added&page_size=40`), // one shared pool of popular games for both sidebar lists
    ])
      .then(([popular, fresh, acclaimed, pool]) => {
        setFeed({
          popular,
          fresh,
          acclaimed,
          topRated: CATEGORY.topRated.refine?.(pool) || pool, // same pool, ranked by user rating
          reviewed: CATEGORY.reviewed.refine?.(pool) || pool, // same pool, ranked by review count
        });
        setLoading(false);
      })
      .catch(e => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => { loadGames(); }, []);

  // Start listening for login/logout the moment the app mounts.
  // Supabase calls us back immediately with the current answer (that's
  // what ends the "checking" phase), then again on every login/logout.
  useEffect(() => {
    const stopWatching = watchSession((newSession) => {
      setSession(newSession);
      setCheckingSession(false);
      // A session appearing means a login just succeeded (or was found in
      // storage) — close the modal. AuthForm still needs no callback; the
      // subscription is the messenger, same as always.
      if (newSession) {
        setAuthMode(null);
      }
    });

    // React calls this when App unmounts — we stop listening politely,
    // the same cleanup pattern as removeEventListener.
    return stopWatching;
  }, []);

  // Load the saved list whenever the logged-in user changes.
  // This used to run once on startup, but now the list belongs to a
  // person, not to the browser — so we wait for a session before asking,
  // and we re-run on login/logout (the [session] dependency below).
  useEffect(() => {
    // Nobody logged in → there is no list to load. Clear whatever is on
    // screen so one user's games never linger after they log out.
    if (!session) {
      setUserList([]);
      return;
    }

    fetchList()
      .then(setUserList)
      .catch(err => console.error("Could not load list:", err));
  }, [session]);

  // Debounced search: wait until the user pauses typing, then ask RAWG to
  // search its entire database. AbortController cancels stale in-flight requests.
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    const controller = new AbortController();

    const timer = setTimeout(() => {
      fetch(`${RAWG}/games?key=${RAWG_KEY}&search=${encodeURIComponent(trimmedQuery)}&page_size=40`, { signal: controller.signal })
        .then(response => {
          if (!response.ok) throw new Error("RAWG responded with " + response.status);
          return response.json();
        })
        .then(data => {
          setSearchResults((data.results || []).map(mapGame));
          setSearching(false);
        })
        .catch(e => {
          // Ignore the error we cause ourselves by aborting a stale request.
          if (e.name !== "AbortError") {
            setSearchError(e.message);
            setSearching(false);
          }
        });
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    if (typeof document !== "undefined") document.body.style.background = T.bg;
  }, [T.bg]);

  const listMap = useMemo(
    () => Object.fromEntries(userList.map(entry => [entry.gameId, entry])),
    [userList],
  );

  // Combined, de-duplicated set of everything we've loaded (for Browse + rank lookups)
  const allGames = useMemo(() => {
    const byId = new Map<number, Game>();
    const everything = [...feed.popular, ...feed.fresh, ...feed.acclaimed, ...feed.topRated, ...feed.reviewed];
    for (const game of everything) {
      byId.set(game.id, game);
    }
    return [...byId.values()];
  }, [feed]);

  const open = (game: Game) => {
    setSelGame(game);
    setPage("detail");
    window.scrollTo(0, 0);
  };

  const openCategory = (key: string) => {
    setCategory(key);
    setPage("category");
    window.scrollTo(0, 0);
  };

  const goHome = () => {
    setSelGame(null);
    setQuery("");
    setPage("home");
  };

  const goBack = () => {
    setSelGame(null);
    // If a search is active, stay on the current page; otherwise go home.
    setPage(query.trim() ? page : "home");
  };

  // Update the search box, clearing any open detail view once a query is typed.
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (value) {
      setSelGame(null);
      if (page === "detail") setPage("home");
    }
  };

  const saveEntry = (entry: Entry) => {
    // Saving needs an account — the list lives in the user's own rows in
    // Supabase. If nobody is logged in, open the signup form instead of
    // letting the request fail; their click told us exactly what they
    // want to do, they just need an account to do it.
    if (!session) {
      setAuthMode("signup");
      return;
    }

    // Update the screen right away (optimistic), then save to the backend in
    // the background so the change survives a refresh.
    setUserList(prev => {
      const withoutThisGame = prev.filter(existing => existing.gameId !== entry.gameId);
      return [...withoutThisGame, entry];
    });
    postEntry(entry).catch(err => console.error("Could not save entry:", err));
  };

  const removeEntry = (id: number) => {
    // Same guard as saveEntry. Logged-out users have no entries to remove
    // anyway, so this is belt-and-suspenders — but failing loudly toward
    // "log in" beats failing silently toward the console.
    if (!session) {
      setAuthMode("signin");
      return;
    }

    setUserList(prev => prev.filter(entry => entry.gameId !== id));
    deleteEntry(id).catch(err => console.error("Could not remove entry:", err));
  };

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
                  onChange={(e) => handleSearchChange(e.target.value)}
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

              {/* Account corner — a three-way slot:
                  1. Still waiting to hear from Supabase → show nothing, so a
                     logged-in user never sees "Log in" flash on page load.
                  2. Logged out → Log in (quiet) + Sign up (accent) buttons.
                     They open the same modal, just in different modes.
                  3. Logged in → Log out. signOut clears the session,
                     watchSession hears it, and this slot re-renders itself. */}
              {checkingSession ? null : session ? (
                <>
                {/* Your profile — same square style as the theme toggle.
                    Only rendered when logged in, since it edits YOUR row. */}
                <button
                  onClick={() => { setSelGame(null); setQuery(""); setPage("profile"); }}
                  title="Your profile"
                  aria-label="Your profile"
                  style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    border: `1px solid ${T.borderH}`, background: T.surface, color: T.text,
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <Icon name="user" size={17} color={page === "profile" ? T.accent : T.text} />
                </button>
                <button
                  onClick={() => signOut().catch(err => console.error("Could not log out:", err))}
                  title="Log out of your account"
                  style={{
                    height: 36, padding: "0 14px", borderRadius: 9, flexShrink: 0,
                    border: `1px solid ${T.borderH}`, background: T.surface, color: T.meta,
                    fontSize: 13, fontWeight: 500, cursor: "pointer",
                  }}
                >
                  Log out
                </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setAuthMode("signin")}
                    style={{
                      height: 36, padding: "0 14px", borderRadius: 9, flexShrink: 0,
                      border: `1px solid ${T.borderH}`, background: T.surface, color: T.text,
                      fontSize: 13, fontWeight: 500, cursor: "pointer",
                    }}
                  >
                    Log in
                  </button>
                  <button
                    onClick={() => setAuthMode("signup")}
                    style={{
                      height: 36, padding: "0 14px", borderRadius: 9, flexShrink: 0,
                      border: "none", background: T.accent, color: "#fff",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Body */}
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px 60px" }}>
          {(page === "detail" && selGame) ? (
            <DetailPage game={selGame} entry={listMap[selGame.id]} games={allGames} onBack={goBack} onSave={saveEntry} onRemove={removeEntry} myUserId={session ? session.user.id : null} onRequireLogin={() => setAuthMode("signup")} />
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
          ) : page === "profile" && session ? (
            <ProfilePage userId={session.user.id} />
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

        {/* The login/signup modal — rendered on top of everything when a
            header button (or a logged-out save attempt) opens it.
            Clicking the dark backdrop closes it; clicking inside the card
            does NOT, because the inner div stops the click from bubbling
            up to the backdrop's onClick. The key={authMode} makes React
            rebuild the form when switching between Log in and Sign up, so
            it always opens in the mode the button promised. */}
        {authMode && (
          <div
            // Close only when the PRESS itself lands on the backdrop. A
            // plain onClick has a trap: press inside the card, release
            // outside (e.g. a long drag-select over a text field), and
            // the browser fires the click on the backdrop — closing the
            // form mid-typing. Same fix as the avatar cropper's backdrop.
            onPointerDown={(e) => { if (e.target === e.currentTarget) setAuthMode(null); }}
            style={{
              position: "fixed", inset: 0, zIndex: 100,
              background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
              display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
            }}
          >
            <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360 }}>
              <AuthForm key={authMode} startMode={authMode} />
            </div>
          </div>
        )}
      </div>
    </ThemeCtx.Provider>
  );
}
