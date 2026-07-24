// comments.ts — reads and writes for the `comments` domain, fully on our Spring
// API. supabase-js is used only to read the login session (the token) — Supabase
// stays the identity authority. No comment data comes from Supabase anymore.
//
// CLEANUP: the API plumbing (API_URL, authHeader, the "optional token" read
// header, throwForStatus) now lives in ./api-client and is shared with the other
// migrated domains. Only this domain's own bits stay here: the response shape,
// the row mapping, the content check, and the error WORDING map.

import type { Comment } from "../lib/types";
import { API_URL, authHeader, optionalAuthHeader, throwForStatus } from "./client";

// This domain's status -> message wording (passed to the shared throwForStatus).
const ERRORS: Record<number, string> = {
  400: "That comment must be between 1 and 2000 characters.",
  401: "You need to be logged in to do that.",
  403: "You can only change your own comments.",
  404: "That comment no longer exists.",
};

// The shape the API's CommentResponse sends back.
type ApiComment = {
  id: number;
  gameId: number;
  content: string;
  createdAt: string;
  editedAt: string | null;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl: string | null;
  likeCount: number;
  likedByMe: boolean;
};

// API response -> app Comment (the flat API shape folded into our nested one).
function apiToComment(r: ApiComment): Comment {
  return {
    id: r.id,
    userId: r.authorId,
    gameId: r.gameId,
    content: r.content,
    createdAt: r.createdAt,
    editedAt: r.editedAt,
    likeCount: r.likeCount,
    likedByMe: r.likedByMe,
    author: {
      username: r.authorUsername,
      avatarUrl: r.authorAvatarUrl,
    },
  };
}

// Instant, in-the-browser check (1–2000 chars) so the form can explain a
// problem before anything leaves the page. The API validates too.
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

// Load every comment for one game, newest first, each with its author and its
// like data. The token is sent only when logged in (optionalAuthHeader), so the
// API can fill likedByMe for this viewer; logged out, it comes back false.
// myUserId is kept in the signature for callers; the token now carries identity.
export async function fetchComments(gameId: number, myUserId: string | null): Promise<Comment[]> {
  void myUserId; // identity comes from the session token now, not this argument

  const res = await fetch(`${API_URL}/api/games/${gameId}/comments`, {
    headers: await optionalAuthHeader(),
  });
  if (!res.ok) {
    await throwForStatus(res, "Couldn't load the comments", ERRORS);
  }

  const rows: ApiComment[] = await res.json();
  return rows.map(apiToComment);
}

// Post one comment. The API stamps the author from the token — no user_id sent.
export async function postComment(gameId: number, content: string): Promise<void> {
  const problem = validateComment(content);
  if (problem) {
    throw new Error(problem);
  }

  const res = await fetch(`${API_URL}/api/games/${gameId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ content: content.trim() }),
  });

  // 201 on success; CommentSection re-reads the list, so we ignore the body.
  if (!res.ok) {
    await throwForStatus(res, "Couldn't post the comment", ERRORS);
  }
}

// Delete one comment. A 403 is the API refusing someone else's comment.
export async function deleteComment(commentId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
    method: "DELETE",
    headers: await authHeader(),
  });

  // 204 No Content on success.
  if (!res.ok) {
    await throwForStatus(res, "Couldn't delete the comment", ERRORS);
  }
}

// Rewrite one of your own comments. The API stamps edited_at, which powers
// the "(edited)" tag.
export async function updateComment(commentId: number, content: string): Promise<void> {
  const problem = validateComment(content);
  if (problem) {
    throw new Error(problem);
  }

  const res = await fetch(`${API_URL}/api/comments/${commentId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(await authHeader()),
    },
    body: JSON.stringify({ content: content.trim() }),
  });

  // 200 on success.
  if (!res.ok) {
    await throwForStatus(res, "Couldn't save the edit", ERRORS);
  }
}

// Like one comment. An empty POST to the comment's /likes path — the API takes
// the user from the token. 201 on success; liking twice is a quiet no-op.
export async function likeComment(commentId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/comments/${commentId}/likes`, {
    method: "POST",
    headers: await authHeader(),
  });

  if (!res.ok) {
    await throwForStatus(res, "Couldn't like the comment", ERRORS);
  }
}

// Un-like: DELETE the same path. 204 on success; unliking something you never
// liked is also a quiet no-op.
export async function unlikeComment(commentId: number): Promise<void> {
  const res = await fetch(`${API_URL}/api/comments/${commentId}/likes`, {
    method: "DELETE",
    headers: await authHeader(),
  });

  if (!res.ok) {
    await throwForStatus(res, "Couldn't remove the like", ERRORS);
  }
}
