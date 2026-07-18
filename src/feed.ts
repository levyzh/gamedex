// feed.ts — the home feed: what the people you follow have been adding.
// This is the payoff of the whole follows system — following someone
// finally CHANGES something about your experience.

import { supabase } from "./supabase";
import type { FeedItem } from "./types";

// Load the newest list entries from everyone the user follows.
//
// Two steps, deliberately plain:
//   1. Ask who I follow (a list of ids).
//   2. Ask for list entries whose owner is ANY of those ids — that's
//      .in(), SQL's "is one of" — newest first, capped at 30.
export async function fetchFeed(myUserId: string): Promise<FeedItem[]> {
  const followsQuery = await supabase
    .from("follows")
    .select("followed_id")
    .eq("follower_id", myUserId);

  if (followsQuery.error) {
    throw new Error(`Couldn't load your feed: ${followsQuery.error.message}`);
  }

  const followedIds = (followsQuery.data ?? []).map(row => row.followed_id);

  // Following nobody = an empty feed, and no reason to bother the
  // database about it.
  if (followedIds.length === 0) {
    return [];
  }

  // The profiles!user_id embed works because of the SECOND foreign key
  // we added to list.user_id — the original one points at auth.users
  // (private), the new one at profiles (public), and the column hint
  // names which road to walk for the author's name and picture.
  const { data, error } = await supabase
    .from("list")
    .select("*, profiles!user_id(username, avatar_url)")
    .in("user_id", followedIds)
    .order("added_at", { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(`Couldn't load your feed: ${error.message}`);
  }

  return (data ?? []).map((row: any) => ({
    userId: row.user_id,
    gameId: row.game_id,
    game: row.game, // stored as jsonb in OUR Game shape — ready to use
    status: row.status,
    score: row.score,
    addedAt: row.added_at,
    author: {
      username: row.profiles?.username ?? "unknown",
      avatarUrl: row.profiles?.avatar_url ?? null,
    },
  }));
}
