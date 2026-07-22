// follows.ts — every read and write of who-follows-whom, now served by our
// Spring API (migrated 2026-07-21). supabase-js is used only for the login
// session (the token) — same split as comments.ts.
//
// The API returns FollowStats and ProfileSummary in the exact shapes the app
// already uses, so there's no row-mapping here — res.json() is the value.
//
// NOTE: the small helpers below (API_URL, authHeader, throwForStatus) are
// duplicated from comments.ts for now. A future cleanup could extract them into
// one shared api-client module; kept inline here to keep this file self-contained.

import { supabase } from "./supabase";
import type { FollowStats, ProfileSummary } from "./types";

// Base URL of the Spring API (dev http://localhost:8080). From VITE_API_URL;
// restart `npm run dev` after adding it to .env.
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  console.error("Missing VITE_API_URL — add it to your .env file (e.g. http://localhost:8080).");
}

// Bearer header from the current session. Throws when logged out — the writes
// (follow/unfollow) require it.
async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error("You need to be logged in to do that.");
  }
  return { Authorization: `Bearer ${token}` };
}

// fetch() doesn't throw on 4xx/5xx — turn a failed response into a readable Error.
async function throwForStatus(res: Response, fallback: string): Promise<never> {
  const byStatus: Record<number, string> = {
    400: "That isn't allowed.",
    401: "You need to be logged in to do that.",
    403: "You can only change your own follows.",
    404: "That user doesn't exist.",
  };
  const body = (await res.text()).trim();
  throw new Error(byStatus[res.status] || body || `${fallback} (error ${res.status}).`);
}

// Everything a user page needs about someone's follows in one call. The token
// is sent only when logged in, so followedByMe/followsMe are filled for the
// viewer (both false when logged out). The API returns this exact shape.
export async function fetchFollowStats(
  userId: string,
  myUserId: string | null
): Promise<FollowStats> {
  const headers: Record<string, string> = {};
  if (myUserId) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  const res = await fetch(`${API_URL}/api/users/${userId}/follow-stats`, { headers });
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load the follow stats");
  }
  return res.json();
}

// Follow someone. The API takes the follower from the token — no id to send.
// 201 on success; following twice is a quiet no-op (composite key).
export async function followUser(userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/users/${userId}/follow`, {
    method: "POST",
    headers: await authHeader(),
  });
  if (!res.ok) {
    await throwForStatus(res, "Couldn't follow");
  }
}

// Unfollow. 204 on success; unfollowing someone you don't follow is a no-op.
export async function unfollowUser(userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/users/${userId}/follow`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) {
    await throwForStatus(res, "Couldn't unfollow");
  }
}

// Who follows this user — public read. The API returns ProfileSummary rows.
export async function fetchFollowers(userId: string): Promise<ProfileSummary[]> {
  const res = await fetch(`${API_URL}/api/users/${userId}/followers`);
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load the followers");
  }
  return res.json();
}

// Who this user follows — public read.
export async function fetchFollowing(userId: string): Promise<ProfileSummary[]> {
  const res = await fetch(`${API_URL}/api/users/${userId}/following`);
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load the following list");
  }
  return res.json();
}
