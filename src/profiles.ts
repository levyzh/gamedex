// profiles.ts — every read and write of the `profiles` table lives here,
// the same way api.ts owns the list table and auth.ts owns supabase.auth.
// If a profile bug ever shows up, this is the file to open.
//
// Reminder of the security model: the table's RLS is "public to read,
// private to write". So fetchProfile works for ANY user's id (that's how
// friends' profiles will load later), while updateProfile can only ever
// touch the logged-in user's own row — the database enforces that, not us.

import { supabase } from "./supabase";
import type { Profile } from "./types";

// Database row → app Profile. Same translation pattern as api.ts:
// the database speaks snake_case (avatar_url), the app speaks camelCase
// (avatarUrl), and the difference stays trapped inside this file.
function rowToProfile(row: any): Profile {
  return {
    id: row.id,
    username: row.username,
    bio: row.bio,
    avatarUrl: row.avatar_url,
    createdAt: row.created_at,
  };
}

// Check a username against the SAME rule the database enforces
// (lowercase letters, digits, underscores, 3-20 chars). Returns a
// human-readable problem, or null when the name is fine.
//
// WHY duplicate the database's check here? Because the database can only
// say no with a cryptic constraint error AFTER a round trip. Checking
// first lets the form explain the rule in plain words, instantly.
export function validateUsername(username: string): string | null {
  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return "Usernames must be 3-20 characters, using only lowercase letters, numbers, and underscores.";
  }
  return null;
}

// Load one profile by user id. Works for anyone's id thanks to the
// public-read policy. .single() means "I expect exactly one row" — and
// thanks to the signup trigger, exactly one row always exists.
export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    throw new Error(`Couldn't load the profile: ${error.message}`);
  }

  return rowToProfile(data);
}

// Save the logged-in user's username and bio.
// We pass the id only to say WHICH row to update — RLS is what guarantees
// it can only ever be their own.
export async function updateProfile(
  userId: string,
  changes: { username: string; bio: string }
): Promise<void> {
  // Fail loudly BEFORE the network trip if the username breaks the rule.
  const problem = validateUsername(changes.username);
  if (problem) {
    throw new Error(problem);
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username: changes.username, bio: changes.bio })
    .eq("id", userId);

  if (error) {
    // 23505 is Postgres's code for "unique constraint violated" — here
    // that can only mean one thing, so translate it into plain words.
    if (error.code === "23505") {
      throw new Error(`The username "${changes.username}" is already taken.`);
    }
    throw new Error(`Couldn't save your profile: ${error.message}`);
  }
}

// Upload a new avatar image and record its URL on the profile.
// Returns the new URL so the page can show the picture immediately.
//
// The flow is three small steps: put the file in Storage, ask Storage
// for the file's public URL, save that URL into profiles.avatar_url.
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  // Fail loudly BEFORE uploading anything unreasonable.
  if (!file.type.startsWith("image/")) {
    throw new Error("Avatars must be an image file (PNG, JPG, GIF, or WebP).");
  }
  const MAX_BYTES = 2 * 1024 * 1024; // 2 MB is plenty for a profile picture
  if (file.size > MAX_BYTES) {
    throw new Error("That image is too big — avatars are limited to 2 MB.");
  }

  // Everyone's avatar lives at "{their-user-id}/avatar". The folder name
  // IS the ownership claim: the Storage policy only lets you write inside
  // the folder matching your own auth.uid().
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

  // The quirk worth knowing: because the path never changes, the URL
  // never changes — and browsers happily keep showing the OLD image from
  // cache after you upload a new one. Adding ?t=<now> makes each upload's
  // URL unique, forcing browsers to fetch the fresh picture.
  const url = `${data.publicUrl}?t=${Date.now()}`;

  const { error: saveError } = await supabase
    .from("profiles")
    .update({ avatar_url: url })
    .eq("id", userId);

  if (saveError) {
    throw new Error(`Couldn't save the new avatar: ${saveError.message}`);
  }

  return url;
}
