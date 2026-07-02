// comments.ts — every read and write of the `comments` table lives here,
// completing the set: api.ts owns list, profiles.ts owns profiles, and
// this file owns comments.
//
// The new trick in this file is the TWO-TABLE QUERY in fetchComments:
// because comments.user_id is a foreign key pointing at profiles, Supabase
// can hand back each comment with its author's profile nested inside it —
// one round trip, no manual joining on our side.

import { supabase } from "./supabase";
import type { Comment } from "./types";

// Database row → app Comment. The joined profile arrives as a nested
// `profiles` object on the row; we fold it into a tidy `author` field.
// The ?? fallbacks should never fire (the foreign key guarantees an
// author exists) — they're seatbelts, not expectations.
//
// myUserId is needed for one question only: "is MY like among these?" —
// which is what lights up the heart.
function rowToComment(row: any, myUserId: string | null): Comment {
  // The embedded likes arrive as an array of { user_id } objects, one
  // per person who liked this comment.
  const likes: { user_id: string }[] = row.comment_likes ?? [];

  return {
    id: row.id,
    userId: row.user_id,
    gameId: row.game_id,
    content: row.content,
    createdAt: row.created_at,
    editedAt: row.edited_at,
    likeCount: likes.length,
    likedByMe: myUserId !== null && likes.some(like => like.user_id === myUserId),
    author: {
      username: row.profiles?.username ?? "unknown",
      avatarUrl: row.profiles?.avatar_url ?? null,
    },
  };
}

// The same rule the database's check constraint enforces (1-2000 chars),
// checked here first so the form can explain it instantly and in plain
// words — same reasoning as validateUsername in profiles.ts.
export function validateComment(content: string): string | null {
  const trimmed = content.trim();
  if (trimmed.length === 0) {
    return "Comments can't be empty.";
  }
  if (trimmed.length > 2000) {
    return `Comments are limited to 2000 characters (this one is ${trimmed.length}).`;
  }
  return null;
}

// Load every comment for one game, newest first, each with its author
// AND its likes.
//
// The select string is now a THREE-table query: "*" = all comment
// columns, "profiles(...)" = follow that foreign key for the author, and
// "comment_likes(user_id)" = follow the OTHER foreign key (the one
// pointing back at comments) and bring every like's user_id along.
//
// Honest tradeoff, flagged: embedding every like scales with how liked
// a comment is — perfect at this project's size, and if a comment ever
// gathers thousands of likes, the fix is asking the database to count
// instead of fetch. A good problem to have; not one to pre-solve.
export async function fetchComments(gameId: number, myUserId: string | null): Promise<Comment[]> {
  const { data, error } = await supabase
    .from("comments")
    .select("*, profiles(username, avatar_url), comment_likes(user_id)")
    .eq("game_id", gameId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Couldn't load the comments: ${error.message}`);
  }

  return (data ?? []).map(row => rowToComment(row, myUserId));
}

// Post one comment on a game.
// No user_id here — the column's default is auth.uid(), so Postgres
// stamps the comment with whoever is logged in, and RLS would reject
// any attempt to claim otherwise. Same pattern as saving a list entry.
export async function postComment(gameId: number, content: string): Promise<void> {
  const problem = validateComment(content);
  if (problem) {
    throw new Error(problem);
  }

  const { error } = await supabase
    .from("comments")
    .insert({ game_id: gameId, content: content.trim() });

  if (error) {
    throw new Error(`Couldn't post the comment: ${error.message}`);
  }
}

// Delete one comment by its id. We only say WHICH comment — RLS
// guarantees the delete can only ever land on the logged-in user's own.
export async function deleteComment(commentId: number): Promise<void> {
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId);

  if (error) {
    throw new Error(`Couldn't delete the comment: ${error.message}`);
  }
}

// Rewrite one of your own comments. Also stamps edited_at, which is
// what makes the honest little "(edited)" tag possible — the content
// changes AND the record admits it changed.
export async function updateComment(commentId: number, content: string): Promise<void> {
  const problem = validateComment(content);
  if (problem) {
    throw new Error(problem);
  }

  const { error } = await supabase
    .from("comments")
    .update({ content: content.trim(), edited_at: new Date().toISOString() })
    .eq("id", commentId);

  if (error) {
    throw new Error(`Couldn't save the edit: ${error.message}`);
  }
}

// Like one comment. No user_id — the default auth.uid() stamps it, and
// the composite primary key means liking twice is impossible by
// construction (the database would refuse the duplicate row).
export async function likeComment(commentId: number): Promise<void> {
  const { error } = await supabase
    .from("comment_likes")
    .insert({ comment_id: commentId });

  if (error) {
    throw new Error(`Couldn't like the comment: ${error.message}`);
  }
}

// Un-like: delete the row for this comment. We don't filter by user —
// RLS already narrows deletes to YOUR rows, so "the like on comment 7
// that I'm allowed to delete" can only be your own.
export async function unlikeComment(commentId: number): Promise<void> {
  const { error } = await supabase
    .from("comment_likes")
    .delete()
    .eq("comment_id", commentId);

  if (error) {
    throw new Error(`Couldn't remove the like: ${error.message}`);
  }
}
