// SettingsPage.tsx — every knob in one place: your profile's text
// (username, bio, privacy), how the app looks (theme), and your account
// (email, password, logging out). ProfilePage is for LOOKING at
// yourself; this page is for CHANGING things — different concerns,
// different files.

import { useEffect, useState, type CSSProperties } from "react";
import Icon from "./Icon";
import { useT, display } from "./theme";
import { fetchProfile, updateProfile } from "./profiles";
import { changePassword, signOut } from "./auth";
import type { Profile } from "./types";

export default function SettingsPage({
  userId,
  userEmail,
  dark,
  onToggleDark,
}: {
  userId: string;
  userEmail: string;       // shown so you know WHICH account you're on
  dark: boolean;           // current theme — App owns this state
  onToggleDark: () => void;
}) {
  const T = useT();

  // ── Profile section state — the same draft-vs-saved pattern the old
  // edit card used: `profile` is what the database knows, the fields
  // below are what's typed, and Save only lights up when they differ.
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [listPublic, setListPublic] = useState(true);

  const [saving, setSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

  // ── Account section state — the password change has its own little
  // world so its errors never mix with the profile form's.
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<{ kind: "saved" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchProfile(userId)
      .then(loaded => {
        setProfile(loaded);
        setUsername(loaded.username);
        setBio(loaded.bio);
        setListPublic(loaded.listPublic);
      })
      .catch(err => setLoadError(err instanceof Error ? err.message : "Something went wrong."));
  }, [userId]);

  const hasProfileChanges = profile !== null
    && (username !== profile.username || bio !== profile.bio || listPublic !== profile.listPublic);

  async function handleSaveProfile() {
    setProfileNotice(null);
    setSaving(true);

    try {
      await updateProfile(userId, { username, bio, listPublic });
      setProfile(prev => (prev ? { ...prev, username, bio, listPublic } : prev));
      setProfileNotice({ kind: "saved", text: "Profile saved." });
    } catch (err) {
      setProfileNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPasswordNotice(null);
    setChangingPassword(true);

    try {
      await changePassword(newPassword);
      setNewPassword(""); // done — don't leave a password sitting in a field
      setPasswordNotice({ kind: "saved", text: "Password changed." });
    } catch (err) {
      setPasswordNotice({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setChangingPassword(false);
    }
  }

  const card: CSSProperties = {
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 14, boxShadow: T.shadow, padding: 26, marginBottom: 20,
  };

  const sectionTitle: CSSProperties = {
    margin: "0 0 18px", fontFamily: display, fontWeight: 700,
    fontSize: 16, letterSpacing: "-0.02em", color: T.text,
  };

  const labelStyle: CSSProperties = {
    display: "block", fontSize: 12, fontWeight: 600, color: T.meta,
    marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em",
  };

  const inputStyle: CSSProperties = {
    width: "100%", boxSizing: "border-box", padding: "9px 12px",
    borderRadius: 9, border: `1px solid ${T.borderH}`, background: T.bg,
    fontSize: 13, color: T.text, outline: "none", colorScheme: T.scheme,
    fontFamily: "inherit",
  };

  const primaryButton = (disabled: boolean): CSSProperties => ({
    padding: "10px 22px", borderRadius: 9, border: "none",
    background: T.accent, color: "#fff", fontWeight: 600, fontSize: 13.5,
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.5 : 1,
  });

  const noticeText = (notice: { kind: "saved" | "error"; text: string }) => (
    <p style={{ margin: "14px 0 0", fontSize: 12.5, lineHeight: 1.5, color: notice.kind === "saved" ? T.accent : "#EF4444" }}>
      {notice.text}
    </p>
  );

  if (loadError) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>
        Couldn't load your settings: {loadError}
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>
        Loading settings…
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", paddingTop: 30 }}>
      <h1 style={{ fontFamily: display, fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", margin: "0 0 20px", color: T.text }}>
        Settings
      </h1>

      {/* ── Profile ─────────────────────────────────────────────────── */}
      <div style={card}>
        <h2 style={sectionTitle}>Profile</h2>

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

        {/* The privacy switch. Only the LIST is affected — the profile,
            avatar, and comments stay public; that's what being part of a
            community means here. */}
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, color: T.text, marginBottom: 4 }}>
          <input
            type="checkbox"
            checked={listPublic}
            onChange={(e) => setListPublic(e.target.checked)}
            style={{ accentColor: T.accent, width: 15, height: 15, cursor: "pointer" }}
          />
          My game list is public
        </label>
        <p style={{ margin: "0 0 18px 23px", fontSize: 12, color: T.metaDim, lineHeight: 1.5 }}>
          When off, visitors to your page see "this list is private" instead of your games.
        </p>

        <button onClick={handleSaveProfile} disabled={!hasProfileChanges || saving} style={primaryButton(!hasProfileChanges || saving)}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        {profileNotice && noticeText(profileNotice)}
      </div>

      {/* ── Appearance ──────────────────────────────────────────────── */}
      <div style={card}>
        <h2 style={sectionTitle}>Appearance</h2>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>Theme</div>
            <div style={{ fontSize: 12, color: T.metaDim, marginTop: 3 }}>
              Remembered on this device — the header's sun/moon button does the same thing.
            </div>
          </div>
          <button
            onClick={onToggleDark}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 16px", borderRadius: 9,
              border: `1px solid ${T.borderH}`, background: T.bg, color: T.text,
              fontSize: 13, fontWeight: 500, cursor: "pointer", flexShrink: 0,
            }}
          >
            <Icon name={dark ? "moon" : "sun"} size={15} color={T.text} />
            {dark ? "Dark" : "Light"}
          </button>
        </div>
      </div>

      {/* ── Account ─────────────────────────────────────────────────── */}
      <div style={card}>
        <h2 style={sectionTitle}>Account</h2>

        <p style={{ margin: "0 0 20px", fontSize: 13, color: T.meta }}>
          Signed in as <strong style={{ color: T.text }}>{userEmail}</strong>
        </p>

        <label style={labelStyle}>New password</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="6+ characters"
          style={{ ...inputStyle, marginBottom: 12 }}
        />
        <button
          onClick={handleChangePassword}
          disabled={!newPassword || changingPassword}
          style={primaryButton(!newPassword || changingPassword)}
        >
          {changingPassword ? "Changing..." : "Change password"}
        </button>
        {passwordNotice && noticeText(passwordNotice)}

        {/* Logging out lives here now instead of the header. signOut
            clears the session, watchSession in App hears it, and the
            whole app re-renders logged-out — including leaving this
            page, since it only renders with a session. */}
        <div style={{ borderTop: `1px solid ${T.border}`, marginTop: 22, paddingTop: 18 }}>
          <button
            onClick={() => signOut().catch(err => console.error("Could not log out:", err))}
            style={{
              padding: "9px 18px", borderRadius: 9,
              border: `1px solid ${T.borderH}`, background: T.bg, color: T.meta,
              fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
