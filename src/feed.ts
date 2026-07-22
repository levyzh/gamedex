// feed.ts — the home feed: what the people you follow have been adding. Served
// by our Spring API's /api/feed, which does the whole follows->list->profiles
// join server-side. supabase-js is used only for the login token.
//
// CLEANUP: API_URL / authHeader / throwForStatus now come from ./api-client.
// (This is also what retired the old Supabase `profiles!user_id` embed and the
// "Could not find a relationship between 'list' and 'profiles'" error — the API
// joins profiles in Java, so no PostgREST relationship is involved.)

import type { FeedItem } from "./types";
import { API_URL, authHeader, throwForStatus } from "./api-client";

// This domain's status -> message wording.
const ERRORS: Record<number, string> = {
  401: "You need to be logged in to see your feed.",
  404: "The feed endpoint wasn't found.",
};

// Load the newest list entries from everyone the user follows. `myUserId` is
// kept in the signature so App.tsx doesn't change, but identity now comes from
// the JWT the API validates. The API returns FeedItem in the app's exact shape,
// so res.json() IS the value — no row-mapping.
export async function fetchFeed(myUserId: string): Promise<FeedItem[]> {
  void myUserId; // identity comes from the token now, not this argument

  const res = await fetch(`${API_URL}/api/feed`, {
    headers: await authHeader(),
  });
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load your feed", ERRORS);
  }
  return res.json();
}
