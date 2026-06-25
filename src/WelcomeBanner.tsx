import { useState, useEffect, useRef } from "react";
import GameCard from "./GameCard";
import ArrowBtn from "./ArrowBtn";
import { display, useT } from "../theme";
import type { Game } from "../types";

export default function CategoryRow({ title, games, onOpen, onViewMore }: { title: string; games: Game[]; onOpen: (g: Game) => void; onViewMore: () => void }) {
  const T = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const update = () => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 1);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1);
  };
  useEffect(() => { update(); }, [games]);

  const scroll = (dir: number) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.85, behavior: "smooth" });
  };

  if (!games || !games.length) return null;

  return (
    <div onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
        <h2 style={{ fontFamily: display, fontWeight: 600, fontSize: 16, color: T.text, letterSpacing: "-0.01em" }}>{title}</h2>
        <button onClick={onViewMore}
          style={{ color: T.link, fontSize: 12, fontWeight: 500, cursor: "pointer", background: "none", border: "none" }}>
          View More
        </button>
      </div>

      <div style={{ position: "relative" }}>
        <div ref={ref} onScroll={update} className="gv-hscroll"
          style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
          {games.map(g => (
            <div key={g.id} style={{ flex: "0 0 calc((100% - 70px) / 5.5)" }}>
              <GameCard game={g} onOpen={onOpen} />
            </div>
          ))}
        </div>
        {hover && !atStart && <ArrowBtn dir="left" onClick={() => scroll(-1)} />}
        {hover && !atEnd && <ArrowBtn dir="right" onClick={() => scroll(1)} />}
      </div>
    </div>
  );
}
