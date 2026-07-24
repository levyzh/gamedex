// FeedSection.tsx — "From people you follow", at the top of Home for
// logged-in users. Each row: who, which game, their status and score,
// and how long ago. Quietly renders NOTHING when there's nothing to
// say (not logged in long enough to follow anyone, or the people you
// follow haven't added games) — an empty feed shouldn't take up space
// apologizing for itself.

import { useEffect, useState } from "react";
import { useT, display } from "./theme";
import { timeAgo } from "./time";
import { fetchFeed } from "./feed";
import type { FeedItem, Game } from "./types";

export default function FeedSection({
  myUserId,
  onOpen,
  onOpenUser,
}: {
  myUserId: string;
  onOpen: (game: Game) => void;
  onOpenUser: (userId: string) => void;
}) {
  const T = useT();

  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);

    fetchFeed(myUserId)
      .then(loaded => {
        setItems(loaded);
        setLoading(false);
      })
      .catch(err => {
        setLoadError(err instanceof Error ? err.message : "Something went wrong.");
        setLoading(false);
      });
  }, [myUserId]);

  // While loading: nothing. The home page shouldn't jump around waiting
  // for a section that might turn out to be empty anyway.
  if (loading) return null;

  // A broken feed gets one quiet line, not a broken home page.
  if (loadError) {
    return (
      <div style={{ marginBottom: 20, fontSize: 12.5, color: T.metaDim }}>
        Couldn't load your feed: {loadError}
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: display, fontWeight: 700, fontSize: 17, letterSpacing: "-0.02em", color: T.text, margin: "0 0 12px" }}>
        From people you follow
      </h2>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {/* Show the freshest handful — a feed, not an archive. */}
        {items.slice(0, 8).map(item => (
          <div
            key={`${item.userId}-${item.gameId}`}
            style={{
              display: "flex", alignItems: "center", gap: 11,
              background: T.surface, border: `1px solid ${T.border}`,
              borderRadius: 11, padding: "10px 14px",
            }}
          >
            {/* The author's face is a door to their page. */}
            <button
              onClick={() => onOpenUser(item.userId)}
              title={item.author.username}
              style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: T.accentSoft, color: T.accent, overflow: "hidden",
                border: "none", padding: 0, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: display, fontWeight: 700, fontSize: 12,
              }}
            >
              {item.author.avatarUrl ? (
                <img src={item.author.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                item.author.username.charAt(0).toUpperCase()
              )}
            </button>

            <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: T.meta, lineHeight: 1.5 }}>
              <button
                onClick={() => onOpenUser(item.userId)}
                style={{ background: "none", border: "none", padding: 0, fontWeight: 600, fontSize: 13, color: T.text, cursor: "pointer", fontFamily: "inherit" }}
              >
                {item.author.username}
              </button>
              {" added "}
              <button
                onClick={() => onOpen(item.game)}
                style={{ background: "none", border: "none", padding: 0, fontWeight: 600, fontSize: 13, color: T.text, cursor: "pointer", fontFamily: "inherit", textAlign: "left" }}
              >
                {item.game.title}
              </button>
            </div>

            <span style={{ fontSize: 12, color: T.metaDim, flexShrink: 0 }}>
              {item.status}{item.score > 0 ? ` · ${item.score}/10` : ""} · {timeAgo(item.addedAt)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
