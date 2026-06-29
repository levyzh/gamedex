import RankRow from "./RankRow";
import { display, useT } from "./theme";
import type { Game } from "./types";

export default function SidebarPanel({ title, games, onOpen, onMore }: { title: string; games: Game[]; onOpen: (g: Game) => void; onMore: () => void }) {
  const T = useT();
  return (
    <div style={{ background: T.panel, border: `1px solid ${T.border}`, borderRadius: 12, marginBottom: 18, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px" }}>
        <span style={{ fontFamily: display, color: T.text, fontWeight: 600, fontSize: 13.5, letterSpacing: "-0.01em" }}>{title}</span>
        <button onClick={onMore} style={{ color: T.link, fontSize: 11.5, fontWeight: 500, cursor: "pointer", background: "none", border: "none", padding: 0 }}>More</button>
      </div>
      <div>
        {games.map((game, index) => <RankRow key={game.id} rank={index + 1} game={game} onOpen={onOpen} />)}
      </div>
    </div>
  );
}
