// api.ts — the three functions App.tsx uses to read and write "My List".
// MIGRATED: this file used to call supabase-js directly against the `list`
// table. It now talks to our Spring API instead — same job, same exported
// function signatures, so nothing that imports this file has to change. This
// is the strangler pattern: swap the innards of one data-access file, leave
// its shape alone. Same split as comments.ts / follows.ts — supabase-js is
// used ONLY to lift the login token out of the session.
//
// What moved where:
//   - READS  -> GET  /api/users/{userId}/list   (PUBLIC — no token; a profile
//               page must show someone's list logged-out. Same as the old
//               Stage-D public-read RLS. Whether to SHOW a private list stays
//               a UI decision via profiles.list_public, unchanged by this move.)
//   - WRITES -> PUT  /api/list/{gameId}  (upsert) and DELETE /api/list/{gameId}
//               (both require the JWT; the API takes the owner from the token,
//               never from us — the server-side echo of the old owner-only RLS).
//
// NOTE: the helpers below (API_URL, authHeader, throwForStatus) are duplicated
// from comments.ts / follows.ts for now. A future cleanup extracts them into
// one shared api-client module; kept inline here to keep this file
// self-contained.

import { supabase } from "./supabase";
import type { Entry } from "./types";

// Base URL of the Spring API (dev http://localhost:8080). From VITE_API_URL;
// restart `npm run dev` after adding it to .env.
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error("Missing VITE_API_URL — add it to your .env file (e.g. http://localhost:8080).");
}

// Bearer header from the current session. Throws when logged out — the writes
// (save/delete) require it.
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You need to be logged in to do that.");
  }
  return { Authorization: `Bearer ${token}` };
}

// fetch() doesn't throw on 4xx/5xx — turn a failed response into a readable
// Error. Prefer a status-specific message, else the server's own body, else
// the fallback. Returns `never` so callers can `await` it as the throw.
async function throwForStatus(res: Response, fallback: string): Promise<never> {
  const byStatus: Record<number, string> = {
    400: "That entry isn't valid.",
    401: "You need to be logged in to do that.",
    403: "You can only change your own list.",
    404: "That entry doesn't exist.",
  };
  const body = (await res.text()).trim();
  throw new Error(byStatus[res.status] || body || `${fallback} (error ${res.status}).`);
}

// ─── translation: API shape ↔ app shape ───────────────────────────────────────
// The API's ListEntryResponse is flat and carries userId + addedAt. Our app
// Entry doesn't use either (the old rowToEntry dropped them too), so we map
// down to exactly { gameId, status, score, hours, game }. `game` is the jsonb
// blob, already in our Game shape.
function apiToEntry(r: any): Entry {
  return {
    gameId: r.gameId,
    status: r.status,
    score: r.score,
    hours: r.hours,
    game: r.game,
  };
}

// App Entry → PUT body. gameId lives in the URL, and userId is deliberately
// absent — the server takes the owner from the JWT. So we send only the
// mutable fields.
function entryToBody(entry: Entry) {
  return {
    status: entry.status,
    score: entry.score,
    hours: entry.hours,
    game: entry.game,
  };
}

// ─── the three functions App.tsx calls (signatures unchanged) ─────────────────

// Load ONE user's whole list — yours or anyone's. Public GET, no token: the
// same call serves "my list" (App passes your id) and "their list" (a user
// page passes theirs).
export async function fetchList(userId: string): Promise<Entry[]> {
  const res = await fetch(`${API_URL}/api/users/${userId}/list`);
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load the list");
  }
  const data = await res.json();
  return (data as any[]).map(apiToEntry);
}

// Add or update one entry (upsert). PUT to /api/list/{gameId}; the API inserts
// or updates the row keyed by (your id, gameId). Returns nothing — nothing in
// App.tsx reads a return value, same as before.
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
    await throwForStatus(res, `Couldn't save "${entry.game.title}"`);
  }
}

// Remove one game from the list by its id. DELETE is idempotent server-side
// (removing a row that's already gone is a quiet 204), so the old "404 is
// fine" forgiveness still holds. The API pins the delete to YOUR row only.
export async function deleteEntry(id: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/list/${id}`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) {
    await throwForStatus(res, "Couldn't remove the entry");
  }
}