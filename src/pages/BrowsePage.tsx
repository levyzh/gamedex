import { useState, useEffect } from "react";
import Icon from "../components/ui/Icon";
import GameCard from "../components/GameCard";
import { BROWSE_SORTERS, FILTER_LABEL, FILTER_PARAM } from "../lib/constants";
import { RAWG, RAWG_KEY, mapGame, rawgGet } from "../api/rawg";
import { display, useT } from "../lib/theme";
import type { FilterOption, Game } from "../lib/types";

export default function BrowsePage({ onOpen }: { onOpen: (g: Game) => void }) {
  const T = useT();
  const [options, setOptions] = useState<FilterOption[]>([]);   // every filter you can add
  const [selected, setSelected] = useState<FilterOption[]>([]); // the filters currently applied
  const [filterSearch, setFilterSearch] = useState("");
  const [gameSearch, setGameSearch] = useState("");             // search games by name
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
    // Fetch a RAWG list endpoint and return its `results` array (or [] on error).
    const grab = async (url: string) => {
      try {
        // rawgGet caches by URL — the genre / platform / tag lists never change,
        // so after the first Browse visit these come back from cache instantly.
        const data = await rawgGet(url);
        return data.results || [];
      } catch {
        return [];
      }
    };

    Promise.all([
      grab(`${RAWG}/genres?key=${RAWG_KEY}`),
      grab(`${RAWG}/platforms/lists/parents?key=${RAWG_KEY}`),
      grab(`${RAWG}/tags?key=${RAWG_KEY}&page_size=40`),
      grab(`${RAWG}/tags?key=${RAWG_KEY}&page_size=40&page=2`),
    ]).then(([genres, platforms, tags1, tags2]) => {
      const genreOptions = genres.map((genre: any) => ({
        type: "genre", value: genre.slug, name: genre.name, count: genre.games_count,
      }));
      const platformOptions = platforms.map((platform: any) => ({
        type: "platform", value: String(platform.id), name: platform.name, count: platform.games_count,
      }));

      // Tags arrive as two pages that can overlap. Keep the popular English ones,
      // sort by popularity, then drop duplicates (keeping the first of each slug).
      const popularTags = [...tags1, ...tags2]
        .filter((tag: any) => tag.language === "eng" && tag.games_count > 100)
        .sort((a: any, b: any) => b.games_count - a.games_count);

      const seenSlugs = new Set<string>();
      const uniqueTags = [];
      for (const tag of popularTags) {
        if (!seenSlugs.has(tag.slug)) {
          seenSlugs.add(tag.slug);
          uniqueTags.push(tag);
        }
      }
      const tagOptions = uniqueTags.map((tag) => ({
        type: "tag", value: tag.slug, name: tag.name, count: tag.games_count,
      }));

      setOptions([...genreOptions, ...platformOptions, ...tagOptions]);
    });
  }, []);

  // Turn the current sort + search + selected filters into a RAWG query string.
  const buildQuery = (pageNum: number) => {
    let query = `ordering=${BROWSE_SORTERS[sort].ordering}&page_size=40&page=${pageNum}`;
    if (debouncedSearch) {
      query += `&search=${encodeURIComponent(debouncedSearch)}`;
    }
    // Group the selected filters by type, adding one query param per type.
    Object.keys(FILTER_PARAM).forEach(type => {
      const values = selected.filter(filter => filter.type === type).map(filter => filter.value);
      if (values.length > 0) {
        query += `&${FILTER_PARAM[type]}=${values.join(",")}`;
      }
    });
    return query;
  };

  // RAWG ORs multiple values within one param, so a game only needs to match ONE
  // of several genres/tags to come back. We tighten that to AND: a game must carry
  // EVERY selected filter to be kept.
  const matchesAll = (game: Game) =>
    selected.every(filter => {
      if (filter.type === "genre")    return game.genreSlugs.includes(filter.value);
      if (filter.type === "tag")      return game.tagSlugs.includes(filter.value);
      if (filter.type === "platform") return game.platformIds.includes(filter.value);
      return true;
    });

  // Because AND-filtering can thin a page down to almost nothing, scan forward a
  // few pages until we've gathered enough matches (or run out of results).
  const MAX_SCAN = 5;
  const TARGET = 12;
  const fetchMatches = async (startPage: number) => {
    let pageNum = startPage;
    let collected: Game[] = [];
    let hasMore = true;
    let pagesScanned = 0;

    while (hasMore && pagesScanned < MAX_SCAN && collected.length < TARGET) {
      // rawgGet handles the ok-check + caching; same query URL => cache hit.
      const data = await rawgGet(`${RAWG}/games?key=${RAWG_KEY}&${buildQuery(pageNum)}`);

      const mappedGames: Game[] = (data.results || []).map(mapGame);
      const matching = mappedGames.filter(matchesAll);
      collected = collected.concat(matching);

      hasMore = !!data.next;
      pageNum += 1;
      pagesScanned += 1;
    }

    return { matches: collected, lastPage: pageNum - 1, hasNext: hasMore };
  };

  // Debounce the game-name search so we don't fire a request on every keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(gameSearch.trim()), 400);
    return () => clearTimeout(timer);
  }, [gameSearch]);

  // Re-fetch from page 1 whenever the chosen filters, sort, or search change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setGames([]);
    setPage(1);

    (async () => {
      try {
        const { matches, lastPage, hasNext } = await fetchMatches(1);
        if (cancelled) return;
        setGames(matches);
        setPage(lastPage);
        setHasNext(hasNext);
        setLoading(false);
      } catch (e) {
        if (!cancelled) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [selected, sort, debouncedSearch]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const { matches, lastPage, hasNext } = await fetchMatches(page + 1);
      // Append only games we don't already have (consecutive pages can overlap).
      setGames(prev => {
        const existingIds = new Set(prev.map(game => game.id));
        const newGames = matches.filter(game => !existingIds.has(game.id));
        return [...prev, ...newGames];
      });
      setPage(lastPage);
      setHasNext(hasNext);
    } catch {
      /* keep what we already have */
    }
    setLoadingMore(false);
  };

  const isSelected = (option: FilterOption) =>
    selected.some(filter => filter.type === option.type && filter.value === option.value);

  const addFilter = (option: FilterOption) => {
    if (!isSelected(option)) {
      setSelected(prev => [...prev, { type: option.type, value: option.value, name: option.name }]);
    }
    setFilterSearch("");
  };

  const removeFilter = (target: FilterOption) => {
    setSelected(prev =>
      prev.filter(filter => !(filter.type === target.type && filter.value === target.value)),
    );
  };

  // Only surface filter options while the user is typing in the filter box —
  // keeps the page compact instead of showing a permanent wall of chips.
  const filterQuery = filterSearch.trim().toLowerCase();
  let addable: FilterOption[] = [];
  if (filterQuery) {
    addable = options
      .filter(option => option.name.toLowerCase().includes(filterQuery))
      .filter(option => !isSelected(option))
      .slice(0, 24);
  }

  return (
    <div style={{ paddingTop: 22 }}>
      {/* Title + sort */}
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h1 style={{ fontFamily: display, fontWeight: 700, fontSize: 22, color: T.text, letterSpacing: "-0.02em" }}>Browse Games</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, color: T.metaDim, fontWeight: 500 }}>Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.borderH}`, background: T.surface, color: T.text, fontSize: 12.5, fontWeight: 500, cursor: "pointer", colorScheme: T.scheme }}>
            {Object.entries(BROWSE_SORTERS).map(([key, sorter]) => <option key={key} value={key}>{sorter.label}</option>)}
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
          {filterQuery && (
            <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 20, background: T.surface, border: `1px solid ${T.borderH}`, borderRadius: 10, boxShadow: T.shadowH, padding: 6, maxHeight: 264, overflowY: "auto" }}>
              {addable.length ? addable.map(option => (
                <button key={`${option.type}:${option.value}`} onClick={() => addFilter(option)}
                  onMouseEnter={(e) => e.currentTarget.style.background = T.cardH}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  style={{ display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12.5, fontWeight: 500, padding: "7px 10px", borderRadius: 7, cursor: "pointer", background: "transparent", color: T.text, border: "none", textAlign: "left" }}>
                  <span>{option.name}</span>
                  <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: "0.03em", textTransform: "uppercase", color: T.metaDim }}>{FILTER_LABEL[option.type]}</span>
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
          {selected.map(filter => (
            <button key={`${filter.type}:${filter.value}`} onClick={() => removeFilter(filter)}
              style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, padding: "5px 10px 5px 13px", borderRadius: 999, cursor: "pointer", background: T.accent, color: "#fff", border: `1px solid ${T.accent}` }}>
              {filter.name} <span style={{ fontSize: 14, lineHeight: 1, opacity: 0.85 }}>×</span>
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
          <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${T.border}`, borderTopColor: T.accent, animation: "gdx-spin 0.8s linear infinite" }} />
          Loading…
        </div>
      ) : error ? (
        <div style={{ color: T.meta, fontSize: 13, padding: "40px 0" }}>Couldn't load games: {error}.</div>
      ) : games.length ? (
        <>
          <div style={{ fontSize: 12, color: T.metaDim, margin: "22px 0 14px" }}>
            {games.length} loaded{selected.length ? ` · ${selected.map(filter => filter.name).join(", ")}` : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px,1fr))", gap: 20 }}>
            {games.map(game => <GameCard key={game.id} game={game} onOpen={onOpen} />)}
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