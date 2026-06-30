import type { CategoryDef, Game, RawGame } from "./types";

// Format a big number compactly: 1500 → "1.5K", 2_000_000 → "2M".
export function fmt(n: number) {
  if (n >= 1_000_000) {
    const millions = (n / 1_000_000).toFixed(1).replace(/\.0$/, ""); // drop a trailing ".0"
    return millions + "M";
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(0) + "K";
  }
  return String(n);
}

// ─── RAWG API (live game data) ─────────────────────────────────────────────────
// The API key now comes from a .env file instead of living in the source. Vite
// only exposes variables prefixed with VITE_ to the browser, so the variable
// must be named VITE_RAWG_KEY. Create a .env file in the project root with:
//   VITE_RAWG_KEY=your_key_here
export const RAWG_KEY = import.meta.env.VITE_RAWG_KEY;

// Fail loudly in development if the key is missing, so a blank or absent .env
// surfaces one clear message instead of a wall of failed RAWG requests.
if (!RAWG_KEY) {
  console.error("Missing VITE_RAWG_KEY — create a .env file with your RAWG API key (see .env.example).");
}

export const RAWG = "https://api.rawg.io/api";

export const FALLBACK_COVER = "linear-gradient(135deg,#1f2433,#3a4358)";

// Flag genuinely adult / NSFW games (hentai, eroge, porn) so we can blur them.
// We deliberately DON'T use the ESRB 18+ rating or broad tags like "nudity" /
// "sexual-content" — those also catch mainstream Mature games (The Witcher 3,
// GTA, Cyberpunk). We only match tags that signal a dedicated adult game.
export const ADULT_TAGS = new Set(["nsfw", "hentai", "eroge"]);

export function isAdult(raw: RawGame) {
  const tags = raw.tags || [];
  return tags.some(tag => ADULT_TAGS.has(tag.slug));
}

// Turn one raw RAWG record into the clean Game shape the rest of the app uses.
export function mapGame(raw: RawGame): Game {
  // RAWG gives a release date like "2017-03-03"; we only want the year number.
  let year: number | string = "—";
  if (raw.released) {
    const parsedYear = Number(raw.released.slice(0, 4));
    if (parsedYear) year = parsedYear; // keep "—" if the date can't be parsed
  }

  // Prefer the critic score (Metacritic is 0–100, so divide to land on 0–10).
  // If there's no critic score, fall back to the user rating (0–5, so double it).
  // If neither exists, leave it at 0.
  let score = 0;
  if (raw.metacritic) {
    score = raw.metacritic / 10;
  } else if (raw.rating) {
    score = raw.rating * 2;
  }

  // Genres arrive as objects; we just want their names. Default to ["Unknown"].
  let genreNames = ["Unknown"];
  if (raw.genres && raw.genres.length > 0) {
    genreNames = raw.genres.map(genre => genre.name);
  }

  return {
    id: raw.id,
    title: raw.name,
    year: year,
    score: Number(score.toFixed(2)),
    genre: genreNames,
    cover: raw.background_image || null,
    members: raw.added || raw.ratings_count || 0,
    userRating: raw.rating || 0,          // average RAWG user rating (0–5)
    ratingsCount: raw.ratings_count || 0, // how many users rated it
    genreSlugs: (raw.genres || []).map(genre => genre.slug),
    tagSlugs: (raw.tags || []).map(tag => tag.slug),
    platformIds: (raw.parent_platforms || []).map(parent => String(parent.platform.id)),
    adult: isAdult(raw),
    dev: "",        // filled in on the detail page
    synopsis: "",   // filled in on the detail page
  };
}

export const members = (game: Game) => game.members || 0;

// Build a RAWG "dates=START,END" range covering the last `daysBack` days.
export function dateWindow(daysBack: number) {
  const toYMD = (date: Date) => date.toISOString().slice(0, 10); // e.g. "2024-06-01"
  const today = new Date();
  const oneDayMs = 86_400_000;
  const past = new Date(today.getTime() - daysBack * oneDayMs);
  return `${toYMD(past)},${toYMD(today)}`;
}

// Shared category definitions — used by both the home rows and the "View More"
// pages so they always pull the same kind of games.
export const CATEGORY: Record<string, CategoryDef> = {
  popular:   { title: "Popular Right Now",    query: () => `dates=${dateWindow(365)}&ordering=-added` },
  fresh:     { title: "New Releases",         query: () => `dates=${dateWindow(120)}&ordering=-added` },
  acclaimed: { title: "Critically Acclaimed", query: () => `ordering=-metacritic` },

  // Both sidebar lists draw from the same pool of most-added (genuinely popular)
  // games, then rank that pool differently — by user rating vs. number of reviews.
  // This avoids RAWG's "-rating" junk problem (1-vote 5.0 games topping the list).
  topRated: {
    title: "Top Ranked",
    query: () => `ordering=-added`,
    refine: (games) => [...games].sort((a, b) => b.userRating - a.userRating),
  },
  reviewed: {
    title: "Most Popular",
    query: () => `ordering=-added`,
    refine: (games) => [...games].sort((a, b) => b.ratingsCount - a.ratingsCount),
  },
};

// A game's cover is either a real image URL or null. Return the matching CSS
// background either way — a gradient fallback when there's no image.
export function coverBg(game: Game) {
  if (game.cover) {
    return {
      backgroundImage: `url(${game.cover})`,
      backgroundSize: "cover",
      backgroundPosition: "center",
    };
  }
  return { background: FALLBACK_COVER };
}
