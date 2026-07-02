// ProfilePage.tsx — YOUR page: the fusion of what strangers see on
// UserPage and what only you can do. Who you are (avatar — click it to
// change — name, bio, clickable follow counts), your collection's
// vitals, and your list itself. All the CONTROLS (username, bio,
// privacy, account) moved to SettingsPage — this page is for looking,
// that one is for changing. The one edit that stays here is the avatar,
// because the picture lives here and click-the-picture is where
// everyone's hand goes first.

import { useEffect, useState, type CSSProperties } from "react";
import GameCard from "./GameCard";
import AvatarCropper from "./AvatarCropper";
import FollowListModal from "./FollowListModal";
import { useT, display } from "./theme";
import { fetchProfile, uploadAvatar } from "./profiles";
import { fetchFollowStats } from "./follows";
import { STATUSES } from "./constants";
import type { Entry, FollowStats, Game, Profile } from "./types";

export default function ProfilePage({
  userId,
  userList,
  onOpen,
  onOpenUser,
  onOpenSettings,
}: {
  userId: string;
  userList: Entry[];                    // your list — App already has it
  onOpen: (game: Game) => void;         // open a game from your list
  onOpenUser: (userId: string) => void; // any public page (incl. yours)
  onOpenSettings: () => void;           // where the edit controls went
}) {
  const T = useT();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<FollowStats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  // Feedback for the one action that still lives here: the avatar.
  const [notice, setNotice] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

  // When the user picks a file we do NOT upload it — we open the cropper
  // on it first. This holds a temporary in-browser URL for the picked
  // image (null = cropper closed).
  const [cropSource, setCropSource] = useState<string | null>(null);

  // Which follow list is open in the modal (null = closed).
  const [followListKind, setFollowListKind] = useState<"followers" | "following" | null>(null);

  // Load the profile and the follow numbers together.
  // fetchFollowStats gets null for "who's asking": the personal
  // questions (do I follow them / do they follow me) don't apply to
  // yourself — we only want the counts.
  useEffect(() => {
    Promise.all([
      fetchProfile(userId),
      fetchFollowStats(userId, null),
    ])
      .then(([loadedProfile, loadedStats]) => {
        setProfile(loadedProfile);
        setStats(loadedStats);
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : "Something went wrong."));
  }, [userId]);

  // Runs when the user picks an image file. The <input type="file"> is
  // invisible; clicking the avatar (a <label> pointing at it) opens the
  // picker. Picking doesn't upload — it opens the cropper first.
  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clear the input right away so picking the SAME file again still
    // fires this handler (browsers skip onChange if the value is equal).
    e.target.value = "";
    if (!file) return;

    // Fail loudly before opening the cropper on something it can't crop.
    if (!file.type.startsWith("image/")) {
      setNotice({ kind: "error", text: "Avatars must be an image file (PNG, JPG, GIF, or WebP)." });
      return;
    }

    setNotice(null);
    // An object URL is a temporary address for a file living in the
    // browser's memory — it lets <img> display the photo without any
    // upload having happened.
    setCropSource(URL.createObjectURL(file));
  }

  // The cropper was cancelled: free the in-memory image and close it.
  function handleCropCancel() {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(null);
  }

  // The cropper produced the final square image — NOW we upload.
  async function handleCropSave(file: File) {
    handleCropCancel(); // close the dialog and free the memory

    setUploading(true);
    try {
      const newUrl = await uploadAvatar(userId, file);
      // Show the new picture immediately — no refetch needed, uploadAvatar
      // hands back the URL it just saved.
      setProfile(prev => (prev ? { ...prev, avatarUrl: newUrl } : prev));
      setNotice({ kind: "saved", text: "Picture updated." });
    } catch (err) {
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setUploading(false);
    }
  }

  // ── The collection's vitals, computed from the list in memory ──────
  // Average score only counts entries you've actually scored — a 0
  // means "unscored", and averaging it in would drag every mean down.
  const scoredEntries = userList.filter(entry => entry.score > 0);
  const averageScore = scoredEntries.length > 0
    ? (scoredEntries.reduce((sum, entry) => sum + entry.score, 0) / scoredEntries.length).toFixed(1)
    : "—";
  const totalHours = userList.reduce((sum, entry) => sum + (entry.hours || 0), 0);

  // How many games sit in each status, in STATUSES' canonical order,
  // skipping empty ones — "Dropped 0" is noise, not information.
  const statusCounts = STATUSES
    .map(status => ({ status, count: userList.filter(entry => entry.status === status).length }))
    .filter(item => item.count > 0);

  // Your list, best-loved first — same ordering UserPage gives visitors.
  const sortedList = userList.slice().sort((a, b) => b.score - a.score);

  const card: CSSProperties = {
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 14, boxShadow: T.shadow,
  };

  if (loadError) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>
        Couldn't load your profile: {loadError}
      </div>
    );
  }

  if (!profile || !stats) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>
        Loading your profile…
      </div>
    );
  }

  return (
    <div style={{ paddingTop: 30 }}>
      {/* ── 1. The identity card ─────────────────────────────────────── */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", padding: "24px 26px" }}>
        {/* The avatar doubles as the upload button — a <label> tied to
            the hidden file input, so clicking opens the file picker. */}
        <label
          htmlFor="avatar-file-input"
          title="Change your picture"
          style={{
            width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
            background: T.accentSoft, color: T.accent, overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: display, fontWeight: 700, fontSize: 28,
            cursor: "pointer", opacity: uploading ? 0.5 : 1,
          }}
        >
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="Your avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            profile.username.charAt(0).toUpperCase()
          )}
        </label>
        <input
          id="avatar-file-input"
          type="file"
          accept="image/*"
          onChange={handleAvatarPick}
          style={{ display: "none" }}
        />

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontFamily: display, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: T.text }}>
              {profile.username}
            </h1>
            <button
              onClick={() => document.getElementById("avatar-file-input")?.click()}
              disabled={uploading}
              style={{ padding: 0, background: "none", border: "none", color: T.link, fontSize: 12.5, fontWeight: 500, cursor: uploading ? "default" : "pointer" }}
            >
              {uploading ? "Uploading..." : "Change picture"}
            </button>
          </div>

          {/* Clickable counts — the same doors UserPage has. */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6, fontSize: 12.5, color: T.meta }}>
            <button
              onClick={() => setFollowListKind("followers")}
              style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, color: T.meta, cursor: "pointer", fontFamily: "inherit" }}
            >
              <strong style={{ color: T.text }}>{stats.followers}</strong> {stats.followers === 1 ? "follower" : "followers"}
            </button>
            <button
              onClick={() => setFollowListKind("following")}
              style={{ background: "none", border: "none", padding: 0, fontSize: 12.5, color: T.meta, cursor: "pointer", fontFamily: "inherit" }}
            >
              <strong style={{ color: T.text }}>{stats.following}</strong> following
            </button>
            <span style={{ color: T.metaDim }}>joined {new Date(profile.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short" })}</span>
          </div>

          {profile.bio && (
            <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: T.textBody, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {profile.bio}
            </p>
          )}

          {notice && (
            <p style={{ margin: "10px 0 0", fontSize: 12.5, color: notice.kind === "saved" ? T.accent : "#EF4444" }}>
              {notice.text}
            </p>
          )}
        </div>

        {/* The two doors: see yourself as strangers do, or go change
            things — the edit form's new home. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            onClick={() => onOpenUser(userId)}
            style={{
              padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: T.surface, border: `1px solid ${T.borderH}`, color: T.text, cursor: "pointer",
            }}
          >
            View public page
          </button>
          <button
            onClick={onOpenSettings}
            style={{
              padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 500,
              background: "none", border: `1px solid ${T.border}`, color: T.meta, cursor: "pointer",
            }}
          >
            Edit in Settings
          </button>
        </div>
      </div>

      {/* ── 2. The stats strip ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginTop: 14 }}>
        {[
          { label: "Games", value: String(userList.length) },
          { label: "Average score", value: averageScore },
          { label: "Hours played", value: totalHours.toLocaleString() },
        ].map(item => (
          <div key={item.label} style={{ ...card, padding: "14px 16px" }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: T.text }}>
              {item.value}
            </div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: T.metaDim, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>

      {/* The status breakdown — only statuses you actually use. */}
      {statusCounts.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
          {statusCounts.map(item => (
            <span key={item.status} style={{ fontSize: 12, color: T.text, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: "5px 12px" }}>
              {item.status} <strong>{item.count}</strong>
            </span>
          ))}
        </div>
      )}

      {/* ── 3. Your list — the same view visitors get, but clicking a
          game lands on DetailPage where YOU can edit the entry. ─────── */}
      <h2 style={{ fontFamily: display, fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em", color: T.text, margin: "34px 0 16px" }}>
        Your list ({sortedList.length})
      </h2>

      {sortedList.length === 0 ? (
        <div style={{ color: T.metaDim, fontSize: 13 }}>
          Nothing here yet — find a game in Browse and add it.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 18 }}>
          {sortedList.map(entry => (
            <div key={entry.gameId}>
              <GameCard game={entry.game} onOpen={onOpen} />
              <div style={{ marginTop: 6, fontSize: 12, color: T.meta }}>
                {entry.status}{entry.score > 0 ? ` · ${entry.score}/10` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* The crop dialog, open whenever a freshly picked image is
          waiting to be positioned. */}
      {cropSource && (
        <AvatarCropper
          imageUrl={cropSource}
          onCancel={handleCropCancel}
          onSave={handleCropSave}
        />
      )}

      {/* The follower/following list, when a count was clicked. */}
      {followListKind && (
        <FollowListModal
          userId={userId}
          kind={followListKind}
          onOpenUser={onOpenUser}
          onClose={() => setFollowListKind(null)}
        />
      )}
    </div>
  );
}
