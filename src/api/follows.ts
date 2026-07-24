// follows.ts — every read and write of who-follows-whom, served by our Spring
// API. supabase-js is used only for the login session (the token).
//
// CLEANUP: the API plumbing (API_URL, authHeader, optionalAuthHeader,
// throwForStatus) now lives in ./api-client, shared across the migrated domains.
// The API returns FollowStats and ProfileSummary in the app's exact shapes, so
// there's no row-mapping here — res.json() is the value.

import type { FollowStats, ProfileSummary } from "./types";
import { API_URL, authHeader, optionalAuthHeader, throwForStatus } from "./api-client";

// This domain's status -> message wording.
const ERRORS: Record<number, string> = {
  400: "That isn't allowed.",
  401: "You need to be logged in to do that.",
  403: "You can only change your own follows.",
  404: "That user doesn't exist.",
};

// Everything a user page needs about someone's follows in one call. The token
// is sent only when logged in (optionalAuthHeader), so followedByMe/followsMe
// are filled for the viewer (both false when logged out). myUserId stays in the
// signature for callers; identity now rides in the token.
export async function fetchFollowStats(
  userId: string,
  myUserId: string | null
): Promise<FollowStats> {
  void myUserId; // identity comes from the session token now, not this argument

  const res = await fetch(`${API_URL}/api/users/${userId}/follow-stats`, {
    headers: await optionalAuthHeader(),
  });
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load the follow stats", ERRORS);
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
    await throwForStatus(res, "Couldn't follow", ERRORS);
  }
}

// Unfollow. 204 on success; unfollowing someone you don't follow is a no-op.
export async function unfollowUser(userId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/users/${userId}/follow`, {
    method: "DELETE",
    headers: await authHeader(),
  });
  if (!res.ok) {
    await throwForStatus(res, "Couldn't unfollow", ERRORS);
  }
}

// Who follows this user — public read. The API returns ProfileSummary rows.
export async function fetchFollowers(userId: string): Promise<ProfileSummary[]> {
  const res = await fetch(`${API_URL}/api/users/${userId}/followers`);
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load the followers", ERRORS);
  }
  return res.json();
}

// Who this user follows — public read.
export async function fetchFollowing(userId: string): Promise<ProfileSummary[]> {
  const res = await fetch(`${API_URL}/api/users/${userId}/following`);
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load the following list", ERRORS);
  }
  return res.json();
}
