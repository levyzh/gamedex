// GameRoute.tsx — turns a URL like /game/3498 into a loaded DetailPage.
// One concern: resolving ":id in the address bar" to "a Game object".
//
// Two ways to arrive here:
//   - Clicked inside the app: App just handed us the game it already
//     holds (cachedGame) — render instantly, no network.
//   - Direct link, bookmark, or refresh: nothing is in memory, so we
//     fetch the game from RAWG by its id. THIS is what makes game URLs
//     shareable — the page can rebuild itself from the address alone.

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import DetailPage from "./DetailPage";
import { RAWG, RAWG_KEY, mapGame } from "../api/rawg";
import { useT } from "../lib/theme";
import type { Entry, Game } from "../lib/types";

export default function GameRoute({
  cachedGame,
  listMap,
  games,
  onBack,
  onSave,
  onRemove,
  myUserId,
  onRequireLogin,
  onOpenUser,
}: {
  cachedGame: Game | null; // the game App last opened, if any
  listMap: Record<number, Entry>;
  games: Game[];
  onBack: () => void;
  onSave: (e: Entry) => void;
  onRemove: (id: number) => void;
  myUserId: string | null;
  onRequireLogin: () => void;
  onOpenUser: (userId: string) => void;
}) {
  const T = useT();

  // The :id from the URL arrives as a string; games are numbered.
  const { id } = useParams();
  const gameId = Number(id);

  const [game, setGame] = useState<Game | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    setLoadError(null);

    // The fast path: the app navigated here with the game in hand.
    if (cachedGame && cachedGame.id === gameId) {
      setGame(cachedGame);
      return;
    }

    // The slow path: rebuild from the URL. Clearing first matters when
    // hopping game-to-game (e.g. via the ranked list on a detail page) —
    // otherwise the OLD game would linger while the new one loads.
    setGame(null);
    fetch(`${RAWG}/games/${gameId}?key=${RAWG_KEY}`)
      .then(response => {
        if (!response.ok) throw new Error("RAWG responded with " + response.status);
        return response.json();
      })
      .then(data => setGame(mapGame(data)))
      .catch(e => setLoadError(e.message));
  }, [gameId, cachedGame]);

  if (!Number.isFinite(gameId)) {
    return <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>That's not a game address.</div>;
  }

  if (loadError) {
    return <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>Couldn't load this game: {loadError}</div>;
  }

  if (!game) {
    return <div style={{ textAlign: "center", padding: "100px 0", color: T.meta, fontSize: 14 }}>Loading game…</div>;
  }

  return (
    <DetailPage
      game={game}
      entry={listMap[game.id]}
      games={games}
      onBack={onBack}
      onSave={onSave}
      onRemove={onRemove}
      myUserId={myUserId}
      onRequireLogin={onRequireLogin}
      onOpenUser={onOpenUser}
    />
  );
}
