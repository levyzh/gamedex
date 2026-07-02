// api.ts — the three functions App.tsx uses to read and write "My List",
// the same way rawg.ts holds every RAWG call. These used to talk to our
// Stage 3 Express + SQLite server; now they talk straight to Supabase
// Postgres. There's no auth code in here because supabase-js quietly
// attaches the logged-in user's token to every request, and Row Level
// Security on the `list` table uses that token to decide which rows you
// can see and touch. The database is the bouncer, not this file.

import { supabase } from "./supabase";
import type { Entry } from "./types";

// One quirk to know about: the database speaks snake_case (game_id) and
// our app speaks camelCase (gameId). These two tiny helpers do the
// translation, so the naming difference stays trapped inside this file.

// Database row → app Entry.
function rowToEntry(row: any): Entry {
  return {
    gameId: row.game_id,
    status: row.status,
    score: row.score,
    hours: row.hours,
    game: row.game, // stored as jsonb, comes back as a ready-to-use object
  };
}

// App Entry → database row. Notice user_id is missing on purpose: the
// column's default is auth.uid(), so Postgres fills in "whoever is logged
// in" by itself. We couldn't lie about it even if we tried — RLS would
// reject a row that isn't ours.
function entryToRow(entry: Entry) {
  return {
    game_id: entry.gameId,
    status: entry.status,
    score: entry.score,
    hours: entry.hours,
    game: entry.game,
  };
}

// Load the logged-in user's whole list. Called whenever a session appears.
// No WHERE clause for the user — RLS already narrows this to their rows.
export async function fetchList(): Promise<Entry[]> {
  const { data, error } = await supabase.from("list").select("*");

  // supabase-js doesn't throw on failure; it hands back an error object.
  // We turn that into a real thrown Error with a readable message.
  if (error) {
    throw new Error(`Couldn't load your list: ${error.message}`);
  }

  return (data ?? []).map(rowToEntry);
}

// Add or update one entry. upsert means: INSERT the row, but if a row
// with this primary key (user_id, game_id) already exists, UPDATE it
// instead — exactly the add-or-edit behavior saveEntry expects.
// The old version returned the saved entry; nothing in App.tsx ever read
// it, so this one just saves or throws.
export async function postEntry(entry: Entry): Promise<void> {
  const { error } = await supabase.from("list").upsert(entryToRow(entry));

  if (error) {
    throw new Error(`Couldn't save "${entry.game.title}": ${error.message}`);
  }
}

// Remove one game from the list by its id. Deleting a row that's already
// gone is quietly fine in Supabase (zero rows deleted, no error), so the
// old "404 is okay" forgiveness happens by itself now.
// We only say WHICH game — RLS guarantees the delete can only ever land
// on the logged-in user's own row, nobody else's.
export async function deleteEntry(id: number): Promise<void> {
  const { error } = await supabase.from("list").delete().eq("game_id", id);

  if (error) {
    throw new Error(`Couldn't remove the entry: ${error.message}`);
  }
}
