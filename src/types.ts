// The raw shape RAWG's API returns for a game — the external, messy format.
// mapGame() is the boundary that converts this into our clean Game type.
export interface RawGame {
  id: number;
  name: string;
  released: string | null;
  metacritic: number | null;
  rating: number;
  background_image: string | null;
  added: number;
  ratings_count: number;
  genres?: { name: string; slug: string }[];
  tags?: { slug: string }[];
  parent_platforms?: { platform: { id: number } }[];
}

// Turn one RAWG game record into the shape our components already expect.
// The shape of a game everywhere in our app. Derived directly from mapGame's
// return value below — that function is what produces objects of this type.
export interface Game {
  id: number;
  title: string;
  year: number | string;
  score: number;
  genre: string[];
  cover: string | null;
  members: number;
  userRating: number;
  ratingsCount: number;
  genreSlugs: string[];
  tagSlugs: string[];
  platformIds: string[];
  adult: boolean;
  dev: string;
  synopsis: string;
}

// A single row in the user's "My List". Bundles their tracking fields with the
// full game object, so list rows render without needing to re-fetch the game.
export interface Entry {
  gameId: number;
  status: string;   // one of STATUSES; kept as string for now
  score: number;
  hours: number;
  game: Game;
}

export interface CategoryDef { title: string; query: () => string; refine?: (l: Game[]) => Game[]; }

// One selectable filter in the Browse sidebar (a genre, platform, or tag).
export interface FilterOption { type: string; value: string; name: string; count?: number; }

// ─── My List page ──────────────────────────────────────────────────────────────
export interface ListItem { game: Game; entry: Entry; }
