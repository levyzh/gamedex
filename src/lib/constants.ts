import type { ListItem } from "./types";

export const STATUSES = ["Playing", "Completed", "On Hold", "Dropped", "Plan to Play"];

export const STATUS_COLOR: Record<string, string> = {
  Playing: "#6E8BFF",
  Completed: "#22C55E",
  "On Hold": "#F59E0B",
  Dropped: "#F87171",
  "Plan to Play": "#9CA3AF",
};

// ─── Browse page (searchable genre / platform / tag filters + server fetch) ────
// Sort options map to RAWG's `ordering` param, so sorting happens across the
// whole catalog rather than only the games already loaded.
export const BROWSE_SORTERS: Record<string, { label: string; ordering: string }> = {
  rank:  { label: "Most Popular", ordering: "-added" },
  score: { label: "Top Rated",    ordering: "-metacritic" },
  year:  { label: "Newest",       ordering: "-released" },
  title: { label: "A–Z",          ordering: "name" },
};

// Each filter type maps to a different RAWG query param.
export const FILTER_PARAM: Record<string, string> = {
  genre: "genres",
  platform: "parent_platforms",
  tag: "tags",
};

export const FILTER_LABEL: Record<string, string> = {
  genre: "Genre",
  platform: "Platform",
  tag: "Tag",
};

// Every list sort falls back to alphabetical title order when the primary values
// tie, so rows have a stable, predictable order instead of jumping around.
const byTitle = (a: ListItem, b: ListItem) => a.game.title.localeCompare(b.game.title);

export const LIST_SORTERS: Record<string, { label: string; fn: (a: ListItem, b: ListItem) => number }> = {
  title: {
    label: "Title (A–Z)",
    fn: byTitle,
  },
  status: {
    label: "Status",
    fn: (a, b) => {
      // Order by where each status sits in STATUSES (Playing first, etc.).
      const byStatus = STATUSES.indexOf(a.entry.status) - STATUSES.indexOf(b.entry.status);
      return byStatus || byTitle(a, b);
    },
  },
  score: {
    label: "Score",
    fn: (a, b) => {
      const byScore = (b.entry.score || 0) - (a.entry.score || 0); // highest score first
      return byScore || byTitle(a, b);
    },
  },
  hours: {
    label: "Hours",
    fn: (a, b) => {
      const byHours = (b.entry.hours || 0) - (a.entry.hours || 0); // most hours first
      return byHours || byTitle(a, b);
    },
  },
};
