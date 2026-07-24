import { useState, type CSSProperties } from "react";
import SectionHeader from "./SectionHeader";
import ListRow from "./ListRow";
import { LIST_SORTERS } from "./constants";
import { display, useT } from "./theme";
import type { Entry, Game } from "./types";

export default function ListPage({ listMap, onOpen, onRemove, onSave }: { listMap: Record<number, Entry>; onOpen: (g: Game) => void; onRemove: (id: number) => void; onSave: (e: Entry) => void }) {
  const T = useT();
  const [sort, setSort] = useState("title");

  // Each entry carries its own game object, so the list works even for games
  // found via search that aren't in the home feed.
  const entries = Object.values(listMap)
    .filter(entry => entry.game)
    .map(entry => ({ game: entry.game, entry }))
    .sort(LIST_SORTERS[sort].fn);

  if (!entries.length) {
    return (
      <div>
        <SectionHeader title="My List" />
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
          <div style={{ color: T.text, fontWeight: 500, fontSize: 15 }}>Nothing here yet</div>
          <div style={{ color: T.meta, fontSize: 13, marginTop: 6 }}>Browse games and add a few to start tracking what you play.</div>
        </div>
      </div>
    );
  }

  const head: CSSProperties = { fontSize: 11, fontWeight: 600, color: T.metaDim, textTransform: "uppercase", letterSpacing: "0.04em", textAlign: "left", padding: "10px 14px" };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 12, margin: "26px 0 12px" }}>
        <h2 style={{ fontFamily: display, fontWeight: 600, fontSize: 16, color: T.text, letterSpacing: "-0.01em" }}>My List ({entries.length})</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11.5, color: T.metaDim, fontWeight: 500 }}>Sort by</span>
          <select value={sort} onChange={(e) => setSort(e.target.value)}
            style={{ padding: "7px 10px", borderRadius: 8, border: `1px solid ${T.borderH}`, background: T.surface, color: T.text, fontSize: 12.5, fontWeight: 500, cursor: "pointer", colorScheme: T.scheme }}>
            {Object.entries(LIST_SORTERS).map(([key, sorter]) => <option key={key} value={key}>{sorter.label}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...head, width: 44, textAlign: "center" }}>#</th>
              <th style={head}>Title</th>
              <th style={{ ...head, width: 150 }}>Status</th>
              <th style={{ ...head, width: 84, textAlign: "center" }}>Score</th>
              <th style={{ ...head, width: 92, textAlign: "center" }}>Hours</th>
              <th style={{ ...head, width: 96 }}></th>
            </tr>
          </thead>
          <tbody>
            {entries.map(({ game, entry }, i) => (
              <ListRow key={game.id} index={i + 1} game={game} entry={entry} onOpen={onOpen} onRemove={onRemove} onSave={onSave} />
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: T.metaDim, marginTop: 10 }}>
        Tip: change a game's status, score, or hours right in the table — edits save automatically.
      </div>
    </div>
  );
}
