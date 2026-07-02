// UserPage.tsx — THE profile page, everyone's including your own. One
// page, one truth: visitors and the owner see the same identity card,
// the same stats, the same list. Being the owner just layers powers on
// top — the avatar becomes click-to-change, and where visitors get a
// Follow button, you get the door to Settings.
//
// (There used to be a separate private ProfilePage; it merged into this
// one. The editing CONTROLS live in SettingsPage.)

import { useEffect, useState, type CSSProperties } from "react";
import GameCard from "./GameCard";
import AvatarCropper from "./AvatarCropper";
import FollowListModal from "./FollowListModal";
import { useT, display } from "./theme";
import { fetchProfile, uploadAvatar } from "./profiles";
import { fetchList } from "./api";
import { fetchFollowStats, followUser, unfollowUser } from "./follows";
import { STATUSES } from "./constants";
import type { Entry, FollowStats, Game, Profile } from "./types";

export default function UserPage({
  userId,
  myUserId,
  onOpen,
  onOpenUser,
  onOpenSettings,
  onRequireLogin,
  onBack,
}: {
  userId: string;                // whose page this is
  myUserId: string | null;       // who's looking (null = logged out)
  onOpen: (game: Game) => void;  // open a game from their list
  onOpenUser: (userId: string) => void; // hop to ANOTHER user's page
  onOpenSettings: () => void;    // owner-only door to the edit controls
  onRequireLogin: () => void;    // logged-out visitor clicked Follow
  onBack: () => void;
}) {
  const T = useT();

  // The three things this page shows, loaded together.
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<FollowStats | null>(null);
  const [list, setList] = useState<Entry[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [followBusy, setFollowBusy] = useState(false);
  const [followError, setFollowError] = useState("");

  // Which follow list is open in the modal (null = closed).
  const [followListKind, setFollowListKind] = useState<"followers" | "following" | null>(null);

  // ── Owner-only machinery: changing the avatar ───────────────────────
  const [uploading, setUploading] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState<{ kind: "saved" | "error"; text: string } | null>(null);
  // When the owner picks a file we do NOT upload it — we open the
  // cropper on it first (null = cropper closed).
  const [cropSource, setCropSource] = useState<string | null>(null);

  const isMyOwnPage = myUserId === userId;

  // Load everything at once. Promise.all = "run all three requests in
  // parallel, continue when the slowest finishes".
  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    setFollowError("");
    setFollowListKind(null); // hopping to a new page closes any open list
    setAvatarNotice(null);

    Promise.all([
      fetchProfile(userId),               // works for ANYONE's id — the
      fetchFollowStats(userId, myUserId), // public-read policies at work
      fetchList(userId),
    ])
      .then(([loadedProfile, loadedStats, loadedList]) => {
        setProfile(loadedProfile);
        setStats(loadedStats);
        setList(loadedList);
        setLoading(false);
      })
      .catch(err => {
        setLoadError(err instanceof Error ? err.message : "Something went wrong.");
        setLoading(false);
      });
  }, [userId, myUserId]);

  async function handleToggleFollow() {
    // A logged-out click on Follow means "I want in" — open the door.
    if (!myUserId) {
      onRequireLogin();
      return;
    }
    if (!stats || followBusy) return;

    setFollowError("");
    setFollowBusy(true);

    try {
      if (stats.followedByMe) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
      // Refetch just the stats — the plain single-code-path way, and the
      // follower count needs updating anyway.
      setStats(await fetchFollowStats(userId, myUserId));
    } catch (err) {
      setFollowError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setFollowBusy(false);
    }
  }

  // ── The owner's avatar flow — identical to how it always worked,
  // just living here now. Only reachable when isMyOwnPage, because the
  // file input below only renders then.
  function handleAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Clear the input right away so picking the SAME file again still
    // fires this handler (browsers skip onChange if the value is equal).
    e.target.value = "";
    if (!file) return;

    // Fail loudly before opening the cropper on something it can't crop.
    if (!file.type.startsWith("image/")) {
      setAvatarNotice({ kind: "error", text: "Avatars must be an image file (PNG, JPG, GIF, or WebP)." });
      return;
    }

    setAvatarNotice(null);
    // An object URL is a temporary in-browser address for the file — it
    // lets the cropper display the photo before any upload happens.
    setCropSource(URL.createObjectURL(file));
  }

  function handleCropCancel() {
    if (cropSource) URL.revokeObjectURL(cropSource);
    setCropSource(null);
  }

  async function handleCropSave(file: File) {
    handleCropCancel(); // close the dialog and free the memory

    setUploading(true);
    try {
      const newUrl = await uploadAvatar(userId, file);
      setProfile(prev => (prev ? { ...prev, avatarUrl: newUrl } : prev));
      setAvatarNotice({ kind: "saved", text: "Picture updated." });
    } catch (err) {
      setAvatarNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>
        Loading profile…
      </div>
    );
  }

  if (loadError || !profile || !stats) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>
        Couldn't load this profile: {loadError ?? "unknown error"}
      </div>
    );
  }

  // May the person LOOKING see the list? The owner always may; others
  // only when it's public. Stats derive from the list, so they follow
  // the same rule — "47 games, 8.2 average" would leak a private list.
  const listVisible = profile.listPublic || isMyOwnPage;

  // ── The collection's vitals ─────────────────────────────────────────
  // Average score only counts scored entries — 0 means "unscored", and
  // averaging it in would drag every mean down.
  const scoredEntries = list.filter(entry => entry.score > 0);
  const averageScore = scoredEntries.length > 0
    ? (scoredEntries.reduce((sum, entry) => sum + entry.score, 0) / scoredEntries.length).toFixed(1)
    : "—";
  const totalHours = list.reduce((sum, entry) => sum + (entry.hours || 0), 0);

  // Games per status, in STATUSES' canonical order, skipping empties —
  // "Dropped 0" is noise, not information.
  const statusCounts = STATUSES
    .map(status => ({ status, count: list.filter(entry => entry.status === status).length }))
    .filter(item => item.count > 0);

  // The list, best-loved games first — the order that says the most
  // about a person.
  const sortedList = list.slice().sort((a, b) => b.score - a.score);

  const card: CSSProperties = {
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 14, boxShadow: T.shadow,
  };

  // The avatar's inner content is the same for everyone; whether it's
  // wrapped in a click-to-change <label> depends on whose page this is.
  const avatarInner = profile.avatarUrl ? (
    <img src={profile.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
  ) : (
    profile.username.charAt(0).toUpperCase()
  );

  const avatarStyle: CSSProperties = {
    width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
    background: T.accentSoft, color: T.accent, overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: display, fontWeight: 700, fontSize: 28,
  };

  return (
    <div style={{ paddingTop: 22 }}>
      <button
        onClick={onBack}
        style={{ background: "none", border: "none", color: T.meta, fontSize: 13, cursor: "pointer", padding: "4px 0", marginBottom: 14 }}
      >
        ← Back
      </button>

      {/* ── The identity card ──────────────────────────────────────── */}
      <div style={{ ...card, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap", padding: "24px 26px" }}>
        {isMyOwnPage ? (
          <>
            {/* On your own page the avatar doubles as the upload button:
                a <label> tied to the hidden file input. */}
            <label htmlFor="avatar-file-input" title="Change your picture"
              style={{ ...avatarStyle, cursor: "pointer", opacity: uploading ? 0.5 : 1 }}>
              {avatarInner}
            </label>
            <input
              id="avatar-file-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarPick}
              style={{ display: "none" }}
            />
          </>
        ) : (
          <div style={avatarStyle}>{avatarInner}</div>
        )}

        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, fontFamily: display, fontWeight: 700, fontSize: 22, letterSpacing: "-0.02em", color: T.text }}>
              {profile.username}
            </h1>
            {/* The mutual signal: shown only when THEY follow YOU —
                which is why it can never appear on your own page. */}
            {stats.followsMe && (
              <span style={{ fontSize: 11, fontWeight: 600, color: T.meta, background: T.accentSoft, borderRadius: 5, padding: "2px 7px" }}>
                Follows you
              </span>
            )}
            {isMyOwnPage && (
              <button
                onClick={() => document.getElementById("avatar-file-input")?.click()}
                disabled={uploading}
                style={{ padding: 0, background: "none", border: "none", color: T.link, fontSize: 12.5, fontWeight: 500, cursor: uploading ? "default" : "pointer" }}
              >
                {uploading ? "Uploading..." : "Change picture"}
              </button>
            )}
          </div>

          {/* The counts are doors, not statistics — each opens the list
              of people behind the number. */}
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

          {avatarNotice && (
            <p style={{ margin: "10px 0 0", fontSize: 12.5, color: avatarNotice.kind === "saved" ? T.accent : "#EF4444" }}>
              {avatarNotice.text}
            </p>
          )}
        </div>

        {/* The right-hand action: visitors get Follow, the owner gets
            the door to the edit controls. */}
        {isMyOwnPage ? (
          <button
            onClick={onOpenSettings}
            style={{
              padding: "9px 18px", borderRadius: 9, fontSize: 13, fontWeight: 600,
              background: T.surface, border: `1px solid ${T.borderH}`, color: T.text, cursor: "pointer",
            }}
          >
            Edit in Settings
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <button
              onClick={handleToggleFollow}
              disabled={followBusy}
              style={{
                padding: "9px 22px", borderRadius: 9, fontSize: 13, fontWeight: 600,
                cursor: followBusy ? "default" : "pointer",
                opacity: followBusy ? 0.6 : 1,
                // Not yet following: the inviting accent button.
                // Already following: the quiet surface button.
                ...(stats.followedByMe
                  ? { background: T.surface, border: `1px solid ${T.borderH}`, color: T.text }
                  : { background: T.accent, border: "none", color: "#fff" }),
              }}
            >
              {followBusy ? "..." : stats.followedByMe ? "Following" : "Follow"}
            </button>
            {followError && (
              <span style={{ color: "#EF4444", fontSize: 12 }}>{followError}</span>
            )}
          </div>
        )}
      </div>

      {/* ── The stats strip — everyone sees it, unless the list it
          derives from is private. ──────────────────────────────────── */}
      {listVisible && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginTop: 14 }}>
            {[
              { label: "Games", value: String(list.length) },
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

          {statusCounts.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {statusCounts.map(item => (
                <span key={item.status} style={{ fontSize: 12, color: T.text, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 999, padding: "5px 12px" }}>
                  {item.status} <strong>{item.count}</strong>
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── The list ───────────────────────────────────────────────── */}
      <h2 style={{ fontFamily: display, fontWeight: 700, fontSize: 19, letterSpacing: "-0.02em", color: T.text, margin: "34px 0 16px" }}>
        {isMyOwnPage ? "Your list" : `${profile.username}'s list`}{listVisible ? ` (${sortedList.length})` : ""}
      </h2>

      {/* A private list: RLS already returned us nothing, but the
          profile's own setting lets us say WHY instead of showing a
          misleading "nothing here yet". */}
      {!listVisible ? (
        <div style={{ color: T.metaDim, fontSize: 13 }}>
          This list is private.
        </div>
      ) : sortedList.length === 0 ? (
        <div style={{ color: T.metaDim, fontSize: 13 }}>
          {isMyOwnPage ? "Nothing here yet — find a game in Browse and add it." : "Nothing here yet."}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 18 }}>
          {sortedList.map(entry => (
            <div key={entry.gameId}>
              <GameCard game={entry.game} onOpen={onOpen} />
              {/* Their personal take, under each card: status, and the
                  score when they've given one (0 means "unscored"). */}
              <div style={{ marginTop: 6, fontSize: 12, color: T.meta }}>
                {entry.status}{entry.score > 0 ? ` · ${entry.score}/10` : ""}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* The owner's crop dialog, open when a freshly picked image is
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
