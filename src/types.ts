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

// ─── Profiles (Stage A) ─────────────────────────────────────────────────────────
// A user's PUBLIC identity — what other people see. Mirrors the `profiles`
// table in Supabase. Never contains private things like the email address.
export interface Profile {
  id: string;              // same uuid as the auth account it belongs to
  username: string;        // unique, lowercase, 3-20 chars
  bio: string;             // always a string, "" when unset (never null)
  avatarUrl: string | null; // filled in when we do Storage in Stage B
  createdAt: string;       // when the account was made
}

// ─── Comments (Stage C) ─────────────────────────────────────────────────────────
// One comment under a game, WITH its author's public profile attached —
// the shape our two-table query returns, translated to camelCase.
export interface Comment {
  id: number;
  userId: string;   // whose it is — how the UI knows to offer YOU edit/delete
  gameId: number;
  content: string;
  createdAt: string;
  editedAt: string | null; // null = never edited; a date = show "(edited)"
  likeCount: number;       // how many people liked it
  likedByMe: boolean;      // ...and whether the logged-in user is one of them
  author: {
    username: string;
    avatarUrl: string | null;
  };
}
