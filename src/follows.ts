// follows.ts — every read and write of the `follows` table lives here,
// completing the set: api.ts owns list, profiles.ts owns profiles,
// comments.ts owns comments, and this file owns who-follows-whom.

import { supabase } from "./supabase";
import type { FollowStats } from "./types";

// Everything a user page needs to know about someone's follows, in one
// call: their follower count, their following count, and whether the
// logged-in user is among the followers.
//
// This function makes good on the promise in comments.ts: instead of
// fetching rows and counting them ourselves (fine for a comment's likes,
// wasteful for potentially thousands of follows), we ask the DATABASE to
// count. That's what { count: "exact", head: true } means — "run the
// query, tell me how many rows matched, send me none of them."
export async function fetchFollowStats(
  userId: string,
  myUserId: string | null
): Promise<FollowStats> {
  // Question 1: how many people follow them?
  const followers = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("followed_id", userId);

  if (followers.error) {
    throw new Error(`Couldn't load the follower count: ${followers.error.message}`);
  }

  // Question 2: how many people do they follow?
  const following = await supabase
    .from("follows")
    .select("*", { count: "exact", head: true })
    .eq("follower_id", userId);

  if (following.error) {
    throw new Error(`Couldn't load the following count: ${following.error.message}`);
  }

  // Questions 3 and 4 — only meaningful when someone is logged in.
  // Both ask "does one specific row exist?", just mirrored: (me → them)
  // is "do I follow them", (them → me) is "do they follow me". Counting
  // a query that can only ever match 0 or 1 rows (it's the primary key)
  // is the plainest way to ask.
  let followedByMe = false;
  let followsMe = false;
  if (myUserId) {
    const mine = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", myUserId)
      .eq("followed_id", userId);

    if (mine.error) {
      throw new Error(`Couldn't check your follow: ${mine.error.message}`);
    }

    followedByMe = (mine.count ?? 0) > 0;

    const theirs = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId)
      .eq("followed_id", myUserId);

    if (theirs.error) {
      throw new Error(`Couldn't check their follow: ${theirs.error.message}`);
    }

    followsMe = (theirs.count ?? 0) > 0;
  }

  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    followedByMe,
    followsMe,
  };
}

// Follow someone. No follower_id — the column's default is auth.uid(),
// so the database stamps YOU as the follower, and RLS would reject any
// attempt to follow on someone else's behalf. Following twice is
// impossible too (composite primary key), as is following yourself
// (the no_self_follow constraint) — the schema is the bouncer.
export async function followUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .insert({ followed_id: userId });

  if (error) {
    throw new Error(`Couldn't follow: ${error.message}`);
  }
}

// Unfollow. We only say WHO to unfollow — RLS narrows deletes to rows
// where you're the follower, so "the follow on them that I may delete"
// can only be your own.
export async function unfollowUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("followed_id", userId);

  if (error) {
    throw new Error(`Couldn't unfollow: ${error.message}`);
  }
}

// The people BEHIND the numbers: who follows this user, and who they
// follow. These two queries are the purest demonstration of the
// two-roads problem from comments.ts — the follows table points at
// profiles TWICE (follower_id and followed_id), so every embed must
// name its road with !column or Supabase refuses to guess.

// Who follows them: take rows where they're the followed one, and for
// each, embed the profile reached through follower_id — the fans.
export async function fetchFollowers(userId: string): Promise<import("./types").ProfileSummary[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("profiles!follower_id(id, username, avatar_url)")
    .eq("followed_id", userId);

  if (error) {
    throw new Error(`Couldn't load the followers: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    id: row.profiles?.id,
    username: row.profiles?.username ?? "unknown",
    avatarUrl: row.profiles?.avatar_url ?? null,
  }));
}

// Who they follow: the same query mirrored — rows where they're the
// follower, embedding the profile reached through followed_id.
export async function fetchFollowing(userId: string): Promise<import("./types").ProfileSummary[]> {
  const { data, error } = await supabase
    .from("follows")
    .select("profiles!followed_id(id, username, avatar_url)")
    .eq("follower_id", userId);

  if (error) {
    throw new Error(`Couldn't load the following list: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    id: row.profiles?.id,
    username: row.profiles?.username ?? "unknown",
    avatarUrl: row.profiles?.avatar_url ?? null,
  }));
}
