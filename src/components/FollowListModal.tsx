// FollowListModal.tsx — the people behind a number. Clicking "12
// followers" on a user page opens this: a small dialog listing who they
// are, each row a door to that person's own page. It's what turns the
// follow graph from statistics into something you can WALK.

import { useEffect, useState } from "react";
import { useT, display } from "../lib/theme";
import { fetchFollowers, fetchFollowing } from "../api/follows";
import type { ProfileSummary } from "../lib/types";

export default function FollowListModal({
  userId,
  kind,
  onOpenUser,
  onClose,
}: {
  userId: string;                       // whose followers/following
  kind: "followers" | "following";      // which of the two lists
  onOpenUser: (userId: string) => void; // a row was clicked
  onClose: () => void;
}) {
  const T = useT();

  const [people, setPeople] = useState<ProfileSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);

    // The two fetchers have identical shapes, so picking one is just
    // picking a function — then the rest of the flow is shared.
    const fetcher = kind === "followers" ? fetchFollowers : fetchFollowing;

    fetcher(userId)
      .then(loaded => {
        setPeople(loaded);
        setLoading(false);
      })
      .catch(err => {
        setLoadError(err instanceof Error ? err.message : "Something went wrong.");
        setLoading(false);
      });
  }, [userId, kind]);

  return (
    // The house modal pattern: close only when the PRESS lands on the
    // backdrop — same trap-avoidance as the cropper and login form.
    <div
      onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 110,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}
    >
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`, borderRadius: 14,
        boxShadow: T.shadowH, width: "100%", maxWidth: 360,
        maxHeight: "70vh", display: "flex", flexDirection: "column",
      }}>
        <h2 style={{ margin: 0, padding: "18px 22px 12px", fontFamily: display, fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: T.text }}>
          {kind === "followers" ? "Followers" : "Following"}
        </h2>

        {/* The list scrolls on its own past ~70% of the screen, so a
            popular account's followers don't become a mile-long dialog. */}
        <div style={{ overflowY: "auto", padding: "0 10px 14px" }}>
          {loading ? (
            <div style={{ color: T.meta, fontSize: 13, padding: "14px 12px" }}>Loading…</div>
          ) : loadError ? (
            <div style={{ color: T.meta, fontSize: 13, padding: "14px 12px" }}>{loadError}</div>
          ) : people.length === 0 ? (
            <div style={{ color: T.metaDim, fontSize: 13, padding: "14px 12px" }}>
              {kind === "followers" ? "No followers yet." : "Not following anyone yet."}
            </div>
          ) : (
            people.map(person => (
              <button
                key={person.id}
                onClick={() => onOpenUser(person.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 11, width: "100%",
                  background: "none", border: "none", borderRadius: 9,
                  padding: "8px 12px", cursor: "pointer", textAlign: "left",
                }}
              >
                {/* Avatar or initial — the fallback pattern, fourth home. */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: T.accentSoft, color: T.accent, overflow: "hidden",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: display, fontWeight: 700, fontSize: 13,
                }}>
                  {person.avatarUrl ? (
                    <img src={person.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    person.username.charAt(0).toUpperCase()
                  )}
                </div>
                <span style={{ fontWeight: 600, fontSize: 13.5, color: T.text }}>
                  {person.username}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
