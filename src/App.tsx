import "./styles";
import { useState, useMemo, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation, useParams } from "react-router-dom";
import Icon from "./Icon";
import SidebarPanel from "./SidebarPanel";
import HomePage from "./HomePage";
import BrowsePage from "./BrowsePage";
import CategoryPage from "./CategoryPage";
import GameRoute from "./GameRoute";
import ListPage from "./ListPage";
import SearchResults from "./SearchResults";
import UserPage from "./UserPage";
import SettingsPage from "./SettingsPage";
import FeedSection from "./FeedSection";
import { CATEGORY, RAWG, RAWG_KEY, mapGame, rawgGet } from "./rawg";
import { fetchList, postEntry, deleteEntry } from "./api";
import { THEMES, ThemeCtx, body, display } from "./theme";
import type { Entry, Game, ProfileSummary } from "./types";
import type { Session } from "@supabase/supabase-js";
import { watchSession } from "./auth";
import { searchProfiles } from "./profiles";
import { AuthForm } from "./AuthForm";

// ─── Route wrappers ────────────────────────────────────────────────────────────
// Small module-level components that read a URL parameter and hand it to
// the real page. They live OUTSIDE App on purpose: a component defined
// inside another gets recreated on every render, which makes React tear
// it down and remount it — state lost, effects refiring. Out here their
// identity is stable.

// /user/:id → UserPage
function UserRoute(props: {
  myUserId: string | null;
  onOpen: (game: Game) => void;
  onOpenUser: (userId: string) => void;
  onOpenSettings: () => void;
  onRequireLogin: () => void;
  onBack: () => void;
}) {
  const { id } = useParams();
  if (!id) return <Navigate to="/" replace />;
  return <UserPage userId={id} {...props} />;
}

// /category/:key → CategoryPage
function CategoryRoute(props: { onBack: () => void; onOpen: (game: Game) => void }) {
  const { key } = useParams();
  if (!key) return <Navigate to="/" replace />;
  return <CategoryPage categoryKey={key} onBack={props.onBack} onOpen={props.onOpen} />;
}

// ─── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  // The theme, remembered across visits. localStorage only holds
  // strings, so we store "dark"/"light"; anything else (including a
  // first visit, where the key doesn't exist) means the default: dark.
  const [dark, setDark] = useState(() => localStorage.getItem("gv-theme") !== "light");
  const T = dark ? THEMES.dark : THEMES.light;

  // Write the choice back whenever it changes, so the next visit opens
  // the way this one looked.
  useEffect(() => {
    localStorage.setItem("gv-theme", dark ? "dark" : "light");
  }, [dark]);

  // ROUTING NOTE: there used to be a `page` state variable here deciding
  // what to show. The URL does that job now — navigate() changes it, the
  // <Routes> block below reads it, and the browser's back button,
  // refresh, and shareable links all work because the address bar is the
  // single source of truth for "where am I".
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Every navigation starts at the top of the new page — this replaces
  // the window.scrollTo calls the old click handlers carried around.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  const [query, setQuery] = useState("");
  // Not "which game is open" anymore (the URL knows that) — this is a
  // CACHE: the game object from the last in-app click, so GameRoute can
  // render instantly instead of refetching what we already had.
  const [selGame, setSelGame] = useState<Game | null>(null);
  const [userList, setUserList] = useState<Entry[]>([]);
  const [showWelcome, setShowWelcome] = useState(true);

  // Who is logged in? An object when someone is, null when nobody is.
  const [session, setSession] = useState<Session | null>(null);
  // On page load there's a brief moment before Supabase has told us the
  // answer. During it we show NEITHER "Log in" nor "Log out" in the
  // header, so a logged-in user never sees the wrong button flash by.
  const [checkingSession, setCheckingSession] = useState(true);

  // Is the login/signup modal open, and in which mode? null means closed.
  const [authMode, setAuthMode] = useState<"signin" | "signup" | null>(null);

  // Live game data from RAWG — distinct lists for the home feed
  const [feed, setFeed] = useState<{ popular: Game[]; fresh: Game[]; acclaimed: Game[]; topRated: Game[]; reviewed: Game[] }>({ popular: [], fresh: [], acclaimed: [], topRated: [], reviewed: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Server-side search across RAWG's full catalog
  const [searchResults, setSearchResults] = useState<Game[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  // People matching the search, shown above the games. Kept separate
  // from the game results so one source failing can't blank the other.
  const [peopleResults, setPeopleResults] = useState<ProfileSummary[]>([]);

  const loadGames = () => {
    setLoading(true);
    setError(null);

    // Fetch a RAWG games query and return the results mapped to our Game shape.
    // rawgGet caches by URL, so the home rows come back instantly on revisit
    // (React drops this page's state when you navigate away, so without the
    // cache every return to Home re-ran all four requests from scratch).
    const getGames = async (queryString: string): Promise<Game[]> => {
      const data = await rawgGet(`${RAWG}/games?key=${RAWG_KEY}&${queryString}`);
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

    // React calls this when App unmounts — we stop listening politely.
    return stopWatching;
  }, []);

  // Load the saved list whenever the logged-in user changes.
  useEffect(() => {
    // Nobody logged in → there is no list to load. Clear whatever is on
    // screen so one user's games never linger after they log out.
    if (!session) {
      setUserList([]);
      return;
    }

    fetchList(session.user.id)
      .then(setUserList)
      .catch(err => console.error("Could not load list:", err));
  }, [session]);

  // Debounced search: wait until the user pauses typing, then ask RAWG to
  // search its entire database. AbortController cancels stale in-flight requests.
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setSearchResults([]);
      setPeopleResults([]);
      setSearching(false);
      setSearchError(null);
      return;
    }

    setSearching(true);
    setSearchError(null);
    const controller = new AbortController();

    const timer = setTimeout(() => {
      // The same pause-in-typing also searches usernames. Honest
      // tradeoff, flagged: a people-search failure only logs to the
      // console — blanking the whole results page because the PEOPLE
      // half hiccuped would punish the common case (searching games).
      searchProfiles(trimmedQuery)
        .then(setPeopleResults)
        .catch(err => {
          console.error("People search failed:", err);
          setPeopleResults([]);
        });

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

  // Combined, de-duplicated set of everything we've loaded (for rank lookups)
  const allGames = useMemo(() => {
    const byId = new Map<number, Game>();
    const everything = [...feed.popular, ...feed.fresh, ...feed.acclaimed, ...feed.topRated, ...feed.reviewed];
    for (const game of everything) {
      byId.set(game.id, game);
    }
    return [...byId.values()];
  }, [feed]);

  // ── Navigation — thin wrappers over navigate() so callers stay tidy ──
  const open = (game: Game) => {
    setSelGame(game); // prime GameRoute's cache for an instant render
    navigate(`/game/${game.id}`);
  };

  const openCategory = (key: string) => navigate(`/category/${key}`);

  const openUser = (userId: string) => navigate(`/user/${userId}`);

  const goHome = () => {
    setQuery("");
    navigate("/");
  };

  // Update the search box. Typing over an open game page returns you
  // home so the results have somewhere to appear (game and user pages
  // deliberately survive an open search — see the render logic below).
  const handleSearchChange = (value: string) => {
    setQuery(value);
    if (value && pathname.startsWith("/game/")) {
      navigate("/");
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
    // Same guard as saveEntry — failing loudly toward "log in" beats
    // failing silently toward the console.
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
    // "Am I here?" now means "does the URL match", not a state variable.
    const active = pathname === target;
    return (
      <button
        onClick={() => { setQuery(""); navigate(target); }}
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
              <NavLink name="Home" target="/" icon="home" />
              <NavLink name="Browse" target="/browse" icon="grid" />
              <NavLink name="My List" target="/list" icon="list" />
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
                  3. Logged in → your profile + settings. (Log out lives
                     inside Settings, keeping the header lean.) */}
              {checkingSession ? null : session ? (
                <>
                <button
                  onClick={() => { setQuery(""); openUser(session.user.id); }}
                  title="Your profile"
                  aria-label="Your profile"
                  style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    border: `1px solid ${T.borderH}`, background: T.surface, color: T.text,
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  {/* Lit when you're on your OWN page — someone else's
                      user page shouldn't light up "your profile". */}
                  <Icon name="user" size={17} color={pathname === `/user/${session.user.id}` ? T.accent : T.text} />
                </button>
                <button
                  onClick={() => { setQuery(""); navigate("/settings"); }}
                  title="Settings"
                  aria-label="Settings"
                  style={{
                    width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                    border: `1px solid ${T.borderH}`, background: T.surface, color: T.text,
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  <Icon name="settings" size={17} color={pathname === "/settings" ? T.accent : T.text} />
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
          {/* An active search takes over the body — EXCEPT on game and
              user pages, which survive it (you can keep reading a game
              while a search waits in the box; typing on a game page
              sends you home first — see handleSearchChange). */}
          {query.trim() && !pathname.startsWith("/game/") && !pathname.startsWith("/user/") ? (
            <SearchResults query={query.trim()} results={searchResults} loading={searching} error={searchError} onOpen={open} people={peopleResults} onOpenUser={openUser} />
          ) : (
            <Routes>
              <Route path="/" element={
                loading ? (
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
                ) : (
                  <div className="gv-body" style={{ display: "flex", gap: 28, paddingTop: 22, alignItems: "flex-start" }}>
                    <main style={{ flex: 1, minWidth: 0 }}>
                      <HomePage popular={feed.popular} fresh={feed.fresh} acclaimed={feed.acclaimed} onOpen={open} onViewMore={openCategory} showWelcome={showWelcome} onDismissWelcome={() => setShowWelcome(false)} />
                      {/* The social feed — only for logged-in users, and
                          it renders nothing until there's something to
                          say (see FeedSection). Sits at the BOTTOM of the
                          page, below the category rows. */}
                      {session && (
                        <FeedSection myUserId={session.user.id} onOpen={open} onOpenUser={openUser} />
                      )}
                    </main>
                    <aside className="gv-rail" style={{ width: 300, flexShrink: 0, position: "sticky", top: 80 }}>
                      <SidebarPanel title="Top Ranked" games={topRanked} onOpen={open} onMore={() => openCategory("topRated")} />
                      <SidebarPanel title="Most Popular" games={mostPopular} onOpen={open} onMore={() => openCategory("reviewed")} />
                    </aside>
                  </div>
                )
              } />

              <Route path="/browse" element={<BrowsePage onOpen={open} />} />

              <Route path="/list" element={
                <div style={{ paddingTop: 8 }}>
                  <ListPage listMap={listMap} onOpen={open} onRemove={removeEntry} onSave={saveEntry} />
                </div>
              } />

              <Route path="/category/:key" element={
                <CategoryRoute onBack={() => navigate(-1)} onOpen={open} />
              } />

              <Route path="/game/:id" element={
                <GameRoute
                  cachedGame={selGame}
                  listMap={listMap}
                  games={allGames}
                  // navigate(-1) is the browser's own back — the routing
                  // upgrade retired our hand-rolled "where did you come
                  // from" guesswork.
                  onBack={() => navigate(-1)}
                  onSave={saveEntry}
                  onRemove={removeEntry}
                  myUserId={session ? session.user.id : null}
                  onRequireLogin={() => setAuthMode("signup")}
                  onOpenUser={openUser}
                />
              } />

              <Route path="/user/:id" element={
                <UserRoute
                  myUserId={session ? session.user.id : null}
                  onOpen={open}
                  onOpenUser={openUser}
                  onOpenSettings={() => navigate("/settings")}
                  onRequireLogin={() => setAuthMode("signup")}
                  onBack={() => navigate(-1)}
                />
              } />

              <Route path="/settings" element={
                // No session, no settings — straight home. This also
                // handles logging out FROM settings: the session
                // vanishes, this re-evaluates, and you land on Home.
                session
                  ? <SettingsPage userId={session.user.id} userEmail={session.user.email ?? ""} dark={dark} onToggleDark={() => setDark(d => !d)} />
                  : <Navigate to="/" replace />
              } />

              {/* Any address we don't recognize goes home. */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
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
            header button (or a logged-out save attempt) opens it. */}
        {authMode && (
          <div
            // Close only when the PRESS itself lands on the backdrop —
            // same trap-avoidance as the avatar cropper's backdrop.
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