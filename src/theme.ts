import type { CategoryDef, Game, RawGame } from "./types";

export const fmt = (n: number) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
  : n >= 1000 ? (n / 1000).toFixed(0) + "K" : String(n);

// ─── RAWG API (live game data) ─────────────────────────────────────────────────
// NOTE: before pushing to GitHub, move this key into a .env file (VITE_RAWG_KEY)
// so it isn't committed publicly. In Stage 3 the backend will hide it entirely.
export const RAWG_KEY = "***REMOVED***";

export const RAWG = "https://api.rawg.io/api";

export const FALLBACK_COVER = "linear-gradient(135deg,#1f2433,#3a4358)";

// Flag genuinely adult / NSFW games (hentai, eroge, porn) so we can blur them.
// We deliberately DON'T use the ESRB 18+ rating or broad tags like "nudity" /
// "sexual-content" — those also catch mainstream Mature games (The Witcher 3,
// GTA, Cyberpunk). We only match tags that signal a dedicated adult game.
export const ADULT_TAGS = new Set(["nsfw", "hentai", "eroge"]);

export function isAdult(r: RawGame) {
  return (r.tags || []).some(t => ADULT_TAGS.has(t.slug));
}

export function mapGame(r: RawGame): Game {
  const year = r.released ? Number(r.released.slice(0, 4)) : null;
  const score = r.metacritic ? r.metacritic / 10 : (r.rating ? r.rating * 2 : 0);
  return {
    id: r.id,
    title: r.name,
    year: year || "—",
    score: Number(score.toFixed(2)),
    genre: (r.genres && r.genres.length) ? r.genres.map(g => g.name) : ["Unknown"],
    cover: r.background_image || null,
    members: r.added || r.ratings_count || 0,
    userRating: r.rating || 0,        // average RAWG user rating (0–5)
    ratingsCount: r.ratings_count || 0, // how many users rated it
    genreSlugs: (r.genres || []).map(x => x.slug),
    tagSlugs: (r.tags || []).map(x => x.slug),
    platformIds: (r.parent_platforms || []).map(x => String(x.platform.id)),
    adult: isAdult(r),
    dev: "",        // filled in on the detail page
    synopsis: "",   // filled in on the detail page
  };
}

export const members = (g: Game) => g.members || 0;

// Shared category definitions — used by both the home rows and the "View More" pages
// so they always pull the same kind of games.
export const dateWindow = (daysBack: number) => {
  const today = new Date();
  const f = (d: Date) => d.toISOString().slice(0, 10);
  return `${f(new Date(today.getTime() - daysBack * 86400000))},${f(today)}`;
};

export const CATEGORY: Record<string, CategoryDef> = {
  popular:   { title: "Popular Right Now",    query: () => `dates=${dateWindow(365)}&ordering=-added` },
  fresh:     { title: "New Releases",         query: () => `dates=${dateWindow(120)}&ordering=-added` },
  acclaimed: { title: "Critically Acclaimed", query: () => `ordering=-metacritic` },
  // Both sidebar lists draw from the pool of most-added (genuinely popular) games,
  // then rank that pool differently — by user rating vs by number of reviews.
  // This avoids RAWG's "-rating" junk problem (1-vote 5.0 games topping the list).
  topRated:  { title: "Top Ranked",  query: () => `ordering=-added`,
               refine: (l) => [...l].sort((a, b) => b.userRating - a.userRating) },
  reviewed:  { title: "Most Popular", query: () => `ordering=-added`,
               refine: (l) => [...l].sort((a, b) => b.ratingsCount - a.ratingsCount) },
};

// Cover can be a real image URL (from RAWG) or null → fall back to a gradient.
export const coverBg = (g: Game) => g.cover
  ? { backgroundImage: `url(${g.cover})`, backgroundSize: "cover", backgroundPosition: "center" }
  : { background: FALLBACK_COVER };
