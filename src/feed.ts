// feed.ts — the home feed: what the people you follow have been adding.
// MIGRATED: this used to read Supabase directly (follows table + a
// `list`→`profiles` embed). It now calls our Spring API's /api/feed, which
// does the whole follows→list→profiles join server-side. supabase-js is used
// only for the login token — same split as comments.ts / follows.ts.
//
// Why this also FIXED a bug: the old Supabase version relied on a
// `profiles!user_id` embed, i.e. a foreign-key relationship PostgREST has to
// know about. When that relationship went missing from PostgREST's schema
// cache, the feed threw "Could not find a relationship between 'list' and
// 'profiles'". Our endpoint joins profiles in Java (findAllById), so it
// depends on no such relationship — the error can't happen anymore.

import { supabase } from "./supabase";
import type { FeedItem } from "./types";

// Base URL of the Spring API (dev http://localhost:8080). From VITE_API_URL.
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error("Missing VITE_API_URL — add it to your .env file (e.g. http://localhost:8080).");
}

// Bearer header from the current session. The feed is YOUR feed — the API
// takes the user from the token — so it's login-only, like a follow write.
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You need to be logged in to see your feed.");
  }
  return { Authorization: `Bearer ${token}` };
}

// fetch() doesn't throw on 4xx/5xx — turn a failed response into a readable Error.
async function throwForStatus(res: Response, fallback: string): Promise<never> {
  const byStatus: Record<number, string> = {
    401: "You need to be logged in to see your feed.",
    404: "The feed endpoint wasn't found.",
  };
  const body = (await res.text()).trim();
  throw new Error(byStatus[res.status] || body || `${fallback} (error ${res.status}).`);
}

// Load the newest list entries from everyone the user follows.
//
// `myUserId` is kept in the signature so App.tsx doesn't change, but it's no
// longer sent: identity now comes from the JWT the API validates, exactly like
// the migrated follow/comment writes. The API returns FeedItem in the app's
// exact shape, so res.json() IS the value — no row-mapping.
export async function fetchFeed(myUserId: string): Promise<FeedItem[]> {
  void myUserId; // identity comes from the token now, not this argument

  const res = await fetch(`${API_URL}/api/feed`, {
    headers: await authHeader(),
  });
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load your feed");
  }
  return res.json();
}