// profiles.ts — every read and write of the `profiles` table, now served by
// our Spring API (migrated — the LAST data table to move off direct-Supabase).
// The one thing still Supabase here is avatar STORAGE (the image file upload),
// which stays Supabase's job forever; only the avatar_url COLUMN write moved
// to the API. So this file now imports supabase ONLY for storage.
//
// CLEANUP: API_URL / authHeader / optionalAuthHeader / throwForStatus come from
// ./api-client, same as the other migrated files. Only the profile domain's own
// bits stay here: the shape mapping and the error wording.
//
//   READS  -> GET /api/users/{userId}/profile   (PUBLIC — a user page must load
//             logged-out) and GET /api/users/search?q=  (the People search)
//   WRITES -> PUT /api/me/profile  and  PUT /api/me/avatar  (authed; the API
//             takes the owner from the JWT, never from us — you can only ever
//             change your OWN row.)

import { supabase } from "./supabase";
import type { Profile, ProfileSummary } from "../lib/types";
import { API_URL, authHeader, throwForStatus } from "./client";

// This domain's status -> message wording. (updateProfile adds a couple of
// per-call messages inline, because "username taken" vs a bad-format 400 read
// better in context than a single generic 400 line.)
const ERRORS: Record<number, string> = {
  400: "That profile isn't valid.",
  401: "You need to be logged in to do that.",
  404: "That profile doesn't exist.",
};

// API ProfileResponse -> app Profile. The API already sends camelCase in the
// app's exact Profile shape (id, username, bio, avatarUrl, listPublic,
// createdAt), so this is a straight pass-through — the snake_case↔camelCase
// translation that used to live here now happens server-side in Java.
function apiToProfile(r: any): Profile {
  return {
    id: r.id,
    username: r.username,
    bio: r.bio,
    avatarUrl: r.avatarUrl,
    listPublic: r.listPublic,
    createdAt: r.createdAt,
  };
}

// Check a username against the SAME rule the database (and now the API) enforce
// — 3-20 chars, lowercase letters / digits / underscores. Returns a
// human-readable problem, or null when the name is fine.
//
// WHY keep this on the client after migrating? Same reason as before: it lets
// the form explain the rule in plain words INSTANTLY, with no round trip. The
// API re-checks it too (that's the trusted copy); this one is just for UX. Same
// pattern as keeping the list-status check client-side.
export function validateUsername(username: string): string | null {
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return "Usernames must be 3-20 characters, using only lowercase letters, numbers, and underscores.";
  }
  return null;
}

// Load one profile by user id. Works for anyone's id — the API GET is public,
// exactly like the old public-read RLS policy allowed.
export async function fetchProfile(userId: string): Promise<Profile> {
  const res = await fetch(`${API_URL}/api/users/${userId}/profile`);
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load the profile", ERRORS);
  }
  return apiToProfile(await res.json());
}

// Save the logged-in user's username, bio, and list privacy. The API takes the
// owner from the JWT, so there's no id to pass — you can only edit your OWN row.
export async function updateProfile(
  userId: string,
  changes: { username: string; bio: string; listPublic: boolean }
): Promise<void> {
  // Fail loudly BEFORE the network trip if the username breaks the rule — same
  // instant feedback as before. (userId stays in the signature so callers don't
  // change, but it isn't sent: the server uses the token's subject.)
  const problem = validateUsername(changes.username);
  if (problem) {
    throw new Error(problem);
  }

  const res = await fetch(`${API_URL}/api/me/profile`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({
      username: changes.username,
      bio: changes.bio,
      listPublic: changes.listPublic,
    }),
  });

  if (!res.ok) {
    // The API returns 400 for BOTH a bad username format and a taken username.
    // It puts the human message in the response body ("...already taken."),
    // and throwForStatus prefers the server body over a generic map entry when
    // no exact-status override is given — so the specific wording comes through.
    await throwForStatus(res, "Couldn't save your profile", ERRORS);
  }
}

// Upload a new avatar image and record its URL on the profile.
//
// SPLIT after migration: the IMAGE still goes to Supabase Storage (that stays
// Supabase forever — no value proxying a file through Java), but saving the
// resulting URL onto profiles.avatar_url is now an API call (PUT /api/me/avatar)
// instead of a direct table write. The flow is still three small steps: put the
// file in Storage, ask Storage for its public URL, save that URL via the API.
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  // Fail loudly BEFORE uploading anything unreasonable.
  if (!file.type.startsWith("image/")) {
    throw new Error("Avatars must be an image file (PNG, JPG, GIF, or WebP).");
  }
  const MAX_BYTES = 2 * 1024 * 1024; // 2 MB is plenty for a profile picture
  if (file.size > MAX_BYTES) {
    throw new Error("That image is too big — avatars are limited to 2 MB.");
  }

  // Everyone's avatar lives at "{their-user-id}/avatar". The folder name IS the
  // ownership claim: the Storage policy only lets you write inside the folder
  // matching your own auth.uid(). (Storage RLS still applies — this call is
  // still direct to Supabase, so that policy is still what guards it.)
  const path = `${userId}/avatar`;

  // upsert: true = "overwrite if a file is already there", which is what
  // changing your picture means.
  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw new Error(`Couldn't upload the image: ${uploadError.message}`);
  }

  // The bucket is public, so every file has a permanent public URL.
  // getPublicUrl doesn't touch the network — it just builds the address.
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  // The quirk worth knowing: because the path never changes, the URL never
  // changes — and browsers happily keep showing the OLD image from cache after
  // you upload a new one. Adding ?t=<now> makes each upload's URL unique,
  // forcing browsers to fetch the fresh picture.
  const url = `${data.publicUrl}?t=${Date.now()}`;

  // Save the URL onto the profile row — now via the API, not a direct write.
  // Owner comes from the JWT, so no id is sent.
  const res = await fetch(`${API_URL}/api/me/avatar`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ avatarUrl: url }),
  });

  if (!res.ok) {
    await throwForStatus(res, "Couldn't save the new avatar", ERRORS);
  }

  return url;
}

// Find people by username — the search box's "People" results. Public API GET.
// The API caps at 20 and orders by username, and treats % / _ in the term
// literally, so the old client-side stripping is no longer needed — but we
// still trim and skip an empty term to avoid a pointless call.
export async function searchProfiles(term: string): Promise<ProfileSummary[]> {
  const cleaned = term.trim();
  if (cleaned.length === 0) {
    return [];
  }

  const res = await fetch(
    `${API_URL}/api/users/search?q=${encodeURIComponent(cleaned)}`
  );
  if (!res.ok) {
    await throwForStatus(res, "Couldn't search people", ERRORS);
  }

  const data = await res.json();
  return (data as any[]).map(row => ({
    id: row.id,
    username: row.username,
    avatarUrl: row.avatarUrl,
  }));
}