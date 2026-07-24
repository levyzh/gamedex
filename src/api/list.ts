// api.ts — the three functions App.tsx uses to read and write "My List",
// served by our Spring API (migrated). supabase-js is no longer used here at
// all — the shared api-client lifts the token when a write needs one.
//
// CLEANUP: API_URL / authHeader / throwForStatus now come from ./api-client.
// Only the list domain's own bits stay here: the shape mapping and the wording.
//
//   READS  -> GET    /api/users/{userId}/list   (PUBLIC — a profile page must
//             show someone's list logged-out; showing a PRIVATE list is a UI
//             decision via profiles.list_public.)
//   WRITES -> PUT/DELETE /api/list/{gameId}      (authed; the API takes the
//             owner from the JWT, never from us.)

import type { Entry } from "../lib/types";
import { API_URL, authHeader, throwForStatus } from "./client";

// This domain's status -> message wording.
const ERRORS: Record<number, string> = {
  400: "That entry isn't valid.",
  401: "You need to be logged in to do that.",
  403: "You can only change your own list.",
  404: "That entry doesn't exist.",
};

// API ListEntryResponse -> app Entry. The API sends userId + addedAt too, but
// the app Entry doesn't use either (the old Supabase mapping dropped them too),
// so we keep exactly { gameId, status, score, hours, game }.
function apiToEntry(r: any): Entry {
  return {
    gameId: r.gameId,
    status: r.status,
    score: r.score,
    hours: r.hours,
    game: r.game,
  };
}

// App Entry -> PUT body. gameId is in the URL; userId is deliberately absent
// (the server takes the owner from the JWT). Send only the mutable fields.
function entryToBody(entry: Entry) {
  return {
    status: entry.status,
    score: entry.score,
    hours: entry.hours,
    game: entry.game,
  };
}

// Load ONE user's whole list — yours or anyone's. Public GET, no token: the
// same call serves "my list" (App passes your id) and "their list" (a user
// page passes theirs).
export async function fetchList(userId: string): Promise<Entry[]> {
  const res = await fetch(`${API_URL}/api/users/${userId}/list`);
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load the list", ERRORS);
  }
  const data = await res.json();
  return (data as any[]).map(apiToEntry);
}

// Add or update one entry (upsert). PUT /api/list/{gameId}; the API inserts or
// updates the row keyed by (your id, gameId). Nothing in App.tsx reads a return.
export async function postEntry(entry: Entry): Promise<void> {
  const res = await fetch(`${API_URL}/api/list/${entry.gameId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify(entryToBody(entry)),
  });
  if (!res.ok) {
    await throwForStatus(res, `Couldn't save "${entry.game.title}"`, ERRORS);
  }
}

// Remove one game from the list by its id. DELETE is idempotent server-side
// (a row that's already gone is a quiet 204), so the old "404 is fine"
// forgiveness still holds. The API pins the delete to YOUR row only.
export async function deleteEntry(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/list/${id}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) {
    await throwForStatus(res, "Couldn't remove the entry", ERRORS);
  }
}
