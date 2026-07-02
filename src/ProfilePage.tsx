// ProfilePage.tsx — where the logged-in user sees and edits their own
// public identity: username and bio (avatar comes in Stage B).
//
// The page owns its own data: App.tsx only hands it a userId, and it
// fetches the profile itself. That keeps App.tsx from having to know
// anything about profiles — same reason BrowsePage does its own fetching.

import { useEffect, useState, type CSSProperties } from "react";
import { useT, display } from "./theme";
import { fetchProfile, updateProfile, uploadAvatar } from "./profiles";
import AvatarCropper from "./AvatarCropper";
import type { Profile } from "./types";

export default function ProfilePage({ userId }: { userId: string }) {
  const T = useT();

  // The saved profile as the database knows it (null = still loading).
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The DRAFT the user is editing — kept separate from `profile` so we
  // always know both what's saved and what's typed. That's how the Save
  // button can tell whether anything actually changed.
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // When the user picks a file we do NOT upload it — we open the cropper
  // on it first. This holds a temporary in-browser URL for the picked
  // image (null = cropper closed). Object URLs must be revoked when done
  // or the browser keeps the image in memory for the whole session.
  const [cropSource, setCropSource] = useState<string | null>(null);
  // One slot for feedback: either a success note or an error, not both.
  const [notice, setNotice] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

  // Load the profile once (and again if the user somehow changes).
  useEffect(() => {
    fetchProfile(userId)
      .then(loaded => {
        setProfile(loaded);
        // Start the draft fields from what's saved.
        setUsername(loaded.username);
        setBio(loaded.bio);
      })
      .catch(err => setLoadError(err.message));
  }, [userId]);

  const hasChanges = profile !== null && (username !== profile.username || bio !== profile.bio);

  async function handleSave() {
    setNotice(null);
    setSaving(true);

    try {
      await updateProfile(userId, { username, bio });
      // The database said yes — update our local copy of "what's saved"
      // so hasChanges goes back to false and the button disables itself.
      setProfile(prev => (prev ? { ...prev, username, bio } : prev));
      setNotice({ kind: "saved", text: "Profile saved." });
    } catch (err) {
      // updateProfile throws readable messages ("that username is taken",
      // the format rule, etc.) — show them to the human as-is.
      setNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }

  // Runs when the user picks an image file. The <input type="file"> is
  // invisible; clicking the avatar circle (a <label> pointing at it) is
  // what opens the file picker. Picking a file doesn't upload anything —
  // it opens the cropper so the user can position the photo first.
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

  // The cropper produced the final square image — NOW we upload, exactly
  // the way the old un-cropped flow did.
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

  // Same "sunken input on a raised card" reasoning as AuthForm: the card
  // is T.surface, so the fields use T.bg to stay visible in dark mode.
  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    borderRadius: 9, border: `1px solid ${T.borderH}`, background: T.bg,
    fontSize: 13, color: T.text, outline: "none", colorScheme: T.scheme,
    fontFamily: "inherit",
  };

  const labelStyle: CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: T.meta,
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em",
  };

  // Loading and failure come first — the form only renders once we
  // actually have a profile to edit.
  if (loadError) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>
        Couldn't load your profile: {loadError}
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>
        Loading your profile…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 30 }}>
      <h1 style={{ fontFamily: display, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 20px", color: T.text }}>
        Your profile
      </h1>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14, padding: "26px", boxShadow: T.shadow }}>
        {/* Identity row: avatar placeholder + who you are. Until Stage B
            gives us real pictures, the "avatar" is the first letter of
            the username in an accent-colored circle. */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          {/* The avatar doubles as the upload button: it's a <label> tied
              to the hidden file input below, so clicking it opens the
              file picker. Shows the picture when one exists, otherwise
              the first letter of the username. */}
          <label
            htmlFor="avatar-file-input"
            title="Change your picture"
            style={{
              width: 56, height: 56, borderRadius: "50%", flexShrink: 0,
              background: T.accentSoft, color: T.accent, overflow: "hidden",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: display, fontWeight: 700, fontSize: 22,
              cursor: "pointer", opacity: uploading ? 0.5 : 1,
            }}
          >
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Your avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
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
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: T.text }}>{profile.username}</div>
            <div style={{ fontSize: 12.5, color: T.metaDim, marginTop: 2 }}>
              Member since {new Date(profile.createdAt).toLocaleDateString()}
            </div>
            <button
              onClick={() => document.getElementById("avatar-file-input")?.click()}
              disabled={uploading}
              style={{
                marginTop: 6, padding: 0, background: "none", border: "none",
                color: T.link, fontSize: 12.5, fontWeight: 500,
                cursor: uploading ? "default" : "pointer",
              }}
            >
              {uploading ? "Uploading..." : "Change picture"}
            </button>
          </div>
        </div>

        <label style={labelStyle}>Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{ ...inputStyle, marginBottom: 6 }}
        />
        {/* State the rule up front, so nobody has to discover it by
            failing a save. */}
        <p style={{ margin: "0 0 18px", fontSize: 12, color: T.metaDim, lineHeight: 1.5 }}>
          3–20 characters: lowercase letters, numbers, and underscores. This is your public name.
        </p>

        <label style={labelStyle}>Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows={4}
          placeholder="Tell people what you play."
          style={{ ...inputStyle, resize: "vertical", marginBottom: 18 }}
        />

        <button
          onClick={handleSave}
          // Disabled when there's nothing new to save, or a save is
          // already in flight — both states where clicking is pointless.
          disabled={!hasChanges || saving}
          style={{
            padding: "10px 22px", borderRadius: 9, border: "none",
            background: T.accent, color: "#fff", fontWeight: 600, fontSize: 13.5,
            cursor: !hasChanges || saving ? "default" : "pointer",
            opacity: !hasChanges || saving ? 0.5 : 1,
          }}
        >
          {saving ? "Saving..." : "Save changes"}
        </button>

        {notice && (
          <p style={{
            margin: "14px 0 0", fontSize: 12.5, lineHeight: 1.5,
            // Success borrows the accent color; errors use the same red
            // as AuthForm (the theme still has no danger token).
            color: notice.kind === "saved" ? T.accent : "#EF4444",
          }}>
            {notice.text}
          </p>
        )}
      </div>

      {/* The crop dialog, open whenever a freshly picked image is
          waiting to be positioned. */}
      {cropSource && (
        <AvatarCropper
          imageUrl={cropSource}
          onCancel={handleCropCancel}
          onSave={handleCropSave}
        />
      )}
    </div>
  );
}
