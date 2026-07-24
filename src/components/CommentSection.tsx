// CommentSection.tsx — the community discussion under a game on the
// detail page. Every comment shows its author's avatar and name, a
// relative time ("2 hours ago"), and a like button; logged-in users can
// post, and each person can edit and delete their own.
//
// It doesn't know or do any auth itself: App tells it who's logged in
// (myUserId, null when nobody) and hands it a "please open the login
// form" callback for when a logged-out visitor tries to join in — the
// same pattern as saveEntry in App.tsx.

import { useEffect, useState } from "react";
import Icon from "./Icon";
import { useT, display } from "./theme";
import { timeAgo } from "./time";
import {
  fetchComments, postComment, updateComment, deleteComment,
  likeComment, unlikeComment,
} from "./comments";
import type { Comment } from "./types";

export default function CommentSection({
  gameId,
  myUserId,
  onRequireLogin,
  onOpenUser,
}: {
  gameId: number;
  myUserId: string | null;
  onRequireLogin: () => void;
  onOpenUser: (userId: string) => void; // click an author → their page
}) {
  const T = useT();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The comment being written, and the state around sending it.
  const [draft, setDraft] = useState("");
  const [posting, setPosting] = useState(false);

  // Which comment is being EDITED (null = none), and the edited text.
  // Only one comment can be in edit mode at a time — plainer, and it's
  // how every big site behaves anyway.
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // Which comment is mid-deletion / mid-like-toggle, so just THAT one
  // can dim or lock instead of the whole section freezing.
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [likeBusyId, setLikeBusyId] = useState<number | null>(null);

  // One error slot for all the actions (post, edit, delete, like) —
  // whatever went wrong most recently, in the author's own words.
  const [actionError, setActionError] = useState("");

  // One loader used for everything: first load, after posting, editing,
  // deleting, liking. Refetching after a change is the plain way — one
  // source of truth (the database), one code path, nothing to go stale.
  function loadComments() {
    fetchComments(gameId, myUserId)
      .then(loaded => {
        setComments(loaded);
        setLoading(false);
      })
      .catch(err => {
        setLoadError(err.message);
        setLoading(false);
      });
  }

  // Reload when a different game is opened — and also when the user logs
  // in or out, because "which hearts are lit up" depends on who's asking.
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    setComments([]);
    setDraft("");
    setEditingId(null);
    setActionError("");
    loadComments();
  }, [gameId, myUserId]);

  async function handlePost() {
    setActionError("");
    setPosting(true);

    try {
      await postComment(gameId, draft);
      setDraft(""); // sent — clear the box
      loadComments(); // and show it (fresh from the database)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setPosting(false);
    }
  }

  // Enter edit mode on one comment: remember which, and start the edit
  // box from what the comment currently says.
  function startEdit(comment: Comment) {
    setActionError("");
    setEditingId(comment.id);
    setEditDraft(comment.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft("");
  }

  async function handleSaveEdit() {
    if (editingId === null) return;
    setActionError("");
    setSavingEdit(true);

    try {
      await updateComment(editingId, editDraft);
      cancelEdit();
      loadComments();
    } catch (err) {
      // Stay in edit mode on failure — the user's text is still in the
      // box, so they can fix or retry without retyping.
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleDelete(commentId: number) {
    setActionError("");
    setDeletingId(commentId);

    try {
      await deleteComment(commentId);
      loadComments();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Couldn't delete the comment.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleLike(comment: Comment) {
    // Logged-out visitors: their click means "I want in" — open the door.
    if (!myUserId) {
      onRequireLogin();
      return;
    }
    // Ignore clicks while this comment's like is already in flight —
    // otherwise a double-click races itself into a duplicate-key error.
    if (likeBusyId === comment.id) return;

    setActionError("");
    setLikeBusyId(comment.id);

    try {
      // The comment already knows whether MY like is on it, so the same
      // button flips both ways.
      if (comment.likedByMe) {
        await unlikeComment(comment.id);
      } else {
        await likeComment(comment.id);
      }
      loadComments();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLikeBusyId(null);
    }
  }

  // A comment author's picture: their avatar if they have one, otherwise
  // their initial — the same fallback ProfilePage uses, just smaller.
  const Avatar = ({ comment }: { comment: Comment }) => (
    <div style={{
      width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
      background: T.accentSoft, color: T.accent, overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: display, fontWeight: 700, fontSize: 14,
    }}>
      {comment.author.avatarUrl ? (
        <img src={comment.author.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        comment.author.username.charAt(0).toUpperCase()
      )}
    </div>
  );

  // The small text-link style shared by Edit / Delete / Cancel.
  const textAction = (disabled: boolean) => ({
    background: "none", border: "none", padding: "2px 4px",
    color: T.metaDim, fontSize: 12, cursor: disabled ? "default" : "pointer",
  } as const);

  return (
    <div style={{ marginTop: 40 }}>
      <h2 style={{ fontFamily: display, fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em", color: T.text, margin: "0 0 16px" }}>
        Comments{!loading && !loadError ? ` (${comments.length})` : ""}
      </h2>

      {/* The composer — or, for logged-out visitors, the invitation. */}
      {myUserId ? (
        <div style={{ marginBottom: 24 }}>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Share your thoughts on this game."
            style={{
              width: "100%", boxSizing: "border-box", padding: "10px 12px",
              borderRadius: 9, border: `1px solid ${T.borderH}`, background: T.surface,
              fontSize: 13, color: T.text, outline: "none", colorScheme: T.scheme,
              fontFamily: "inherit", resize: "vertical",
            }}
          />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8 }}>
            <button
              onClick={handlePost}
              disabled={!draft.trim() || posting}
              style={{
                padding: "8px 18px", borderRadius: 9, border: "none",
                background: T.accent, color: "#fff", fontWeight: 600, fontSize: 13,
                cursor: !draft.trim() || posting ? "default" : "pointer",
                opacity: !draft.trim() || posting ? 0.5 : 1,
              }}
            >
              {posting ? "Posting..." : "Post comment"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={onRequireLogin}
          style={{
            marginBottom: 24, padding: "10px 18px", borderRadius: 9,
            border: `1px solid ${T.borderH}`, background: T.surface,
            color: T.text, fontSize: 13, fontWeight: 500, cursor: "pointer",
          }}
        >
          Log in to join the discussion
        </button>
      )}

      {/* Whatever went wrong most recently, shown once, above the list. */}
      {actionError && (
        <p style={{ margin: "0 0 14px", color: "#EF4444", fontSize: 12.5 }}>{actionError}</p>
      )}

      {/* The comments themselves. */}
      {loading ? (
        <div style={{ color: T.meta, fontSize: 13, padding: "10px 0" }}>Loading comments…</div>
      ) : loadError ? (
        <div style={{ color: T.meta, fontSize: 13, padding: "10px 0" }}>
          Couldn't load the comments: {loadError}
        </div>
      ) : comments.length === 0 ? (
        <div style={{ color: T.metaDim, fontSize: 13, padding: "10px 0" }}>
          No comments yet — be the first.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {comments.map(comment => (
            <div
              key={comment.id}
              style={{
                display: "flex", gap: 12, alignItems: "flex-start",
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 12, padding: "14px 16px",
                opacity: deletingId === comment.id ? 0.5 : 1,
              }}
            >
              <Avatar comment={comment} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  {/* The author's name is a door to their page — the
                      social web's oldest link. */}
                  <button
                    onClick={() => onOpenUser(comment.userId)}
                    style={{ background: "none", border: "none", padding: 0, fontWeight: 600, fontSize: 13.5, color: T.text, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    {comment.author.username}
                  </button>
                  <span style={{ fontSize: 11.5, color: T.metaDim }} title={new Date(comment.createdAt).toLocaleString()}>
                    {timeAgo(comment.createdAt)}
                  </span>
                  {/* The honest tag: only ever shown because edited_at
                      was stamped by an actual edit. Hovering shows when. */}
                  {comment.editedAt && (
                    <span style={{ fontSize: 11.5, color: T.metaDim, fontStyle: "italic" }} title={`Edited ${timeAgo(comment.editedAt)}`}>
                      (edited)
                    </span>
                  )}
                </div>

                {editingId === comment.id ? (
                  /* EDIT MODE: the paragraph becomes a textarea with its
                     own Save/Cancel — nothing else on the page changes. */
                  <div style={{ marginTop: 8 }}>
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      style={{
                        width: "100%", boxSizing: "border-box", padding: "8px 10px",
                        borderRadius: 8, border: `1px solid ${T.borderH}`, background: T.bg,
                        fontSize: 13, color: T.text, outline: "none", colorScheme: T.scheme,
                        fontFamily: "inherit", resize: "vertical",
                      }}
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editDraft.trim() || savingEdit}
                        style={{
                          padding: "6px 14px", borderRadius: 8, border: "none",
                          background: T.accent, color: "#fff", fontWeight: 600, fontSize: 12,
                          cursor: !editDraft.trim() || savingEdit ? "default" : "pointer",
                          opacity: !editDraft.trim() || savingEdit ? 0.5 : 1,
                        }}
                      >
                        {savingEdit ? "Saving..." : "Save"}
                      </button>
                      <button onClick={cancelEdit} disabled={savingEdit} style={textAction(savingEdit)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  /* NORMAL MODE: the comment text. whiteSpace pre-wrap
                     keeps the author's line breaks; wordBreak stops one
                     unbroken string from stretching the layout. */
                  <p style={{ margin: "6px 0 0", fontSize: 13, lineHeight: 1.6, color: T.textBody, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {comment.content}
                  </p>
                )}

                {/* The action row under every comment: the like button
                    for everyone, Edit/Delete only on your own. */}
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                  <button
                    onClick={() => handleToggleLike(comment)}
                    title={comment.likedByMe ? "Remove your like" : "Like this comment"}
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      background: "none", border: "none", padding: "2px 4px",
                      cursor: "pointer",
                      color: comment.likedByMe ? T.accent : T.metaDim,
                      opacity: likeBusyId === comment.id ? 0.5 : 1,
                      fontSize: 12, fontWeight: 600,
                    }}
                  >
                    <Icon name="heart" size={14} color={comment.likedByMe ? T.accent : T.metaDim} />
                    {comment.likeCount > 0 && comment.likeCount}
                  </button>

                  {myUserId === comment.userId && editingId !== comment.id && (
                    <>
                      <button onClick={() => startEdit(comment)} style={textAction(false)}>
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        disabled={deletingId === comment.id}
                        style={textAction(deletingId === comment.id)}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
