// api-client.ts — the shared plumbing every migrated data file uses to talk to
// our Spring API. Extracted (cleanup) from comments.ts / follows.ts / api.ts /
// feed.ts, which each carried their own copy. The MECHANISM lives here; the
// domain knowledge (which endpoints, which error wording) stays in each domain
// file. One concern per file, still — this file's concern is "how we call the
// API," not any one domain.

import { supabase } from "./supabase";

// Base URL of the Spring API (dev http://localhost:8080). From VITE_API_URL;
// restart `npm run dev` after adding it to .env.
export const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error("Missing VITE_API_URL — add it to your .env file (e.g. http://localhost:8080).");
}

// Lift the current login token out of the supabase-js session and return it as
// an Authorization header. THROWS when logged out — the write endpoints require
// a token. supabase-js keeps the token fresh; the API checks its signature.
export async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You need to be logged in to do that.");
  }
  return { Authorization: `Bearer ${token}` };
}

// Like authHeader, but for PUBLIC reads that want per-viewer extras (likedByMe,
// followedByMe) when a session happens to exist. Sends the token if logged in,
// returns {} if not — and NEVER throws. This is the "optional JWT" pattern the
// comment/follow-stats reads use.
export async function optionalAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// fetch() does NOT throw on a 4xx/5xx — it returns ok=false. Call this after a
// failed response to raise a readable Error. Preference order: a per-status
// message from the domain file's `messages` map, else the server's own response
// body, else the generic fallback. `messages` stays in the domain file because
// the wording ("your own follows", "1–2000 characters") is domain knowledge.
// Returns `never` so callers can write `await throwForStatus(...)` as the throw.
export async function throwForStatus(
  res: Response,
  fallback: string,
  messages: Record<number, string> = {}
): Promise<never> {
  const body = (await res.text()).trim();
  throw new Error(messages[res.status] || body || `${fallback} (error ${res.status}).`);
}
