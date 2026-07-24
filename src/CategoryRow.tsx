import { useState, useEffect, useRef } from "react";
import GameCard from "./GameCard";
import ArrowBtn from "./ArrowBtn";
import { display, useT } from "./theme";
import type { Game } from "./types";

export default function CategoryRow({ title, games, onOpen, onViewMore }: { title: string; games: Game[]; onOpen: (g: Game) => void; onViewMore: () => void }) {
  const T = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  // Show/hide the scroll arrows depending on how far the row is scrolled.
  const updateArrows = () => {
    const scroller = ref.current;
    if (!scroller) return;
    setAtStart(scroller.scrollLeft <= 1);
    setAtEnd(scroller.scrollLeft + scroller.clientWidth >= scroller.scrollWidth - 1);
  };
  useEffect(() => { updateArrows(); }, [games]);

  const scroll = (dir: number) => {
    const scroller = ref.current;
    if (scroller) scroller.scrollBy({ left: dir * scroller.clientWidth * 0.85, behavior: "smooth" });
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
        <div ref={ref} onScroll={updateArrows} className="gdx-hscroll"
          style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 4 }}>
          {games.map(game => (
            <div key={game.id} style={{ flex: "0 0 calc((100% - 70px) / 5.5)" }}>
              <GameCard game={game} onOpen={onOpen} />
            </div>
          ))}
        </div>
        {hover && !atStart && <ArrowBtn dir="left" onClick={() => scroll(-1)} />}
        {hover && !atEnd && <ArrowBtn dir="right" onClick={() => scroll(1)} />}
      </div>
    </div>
  );
}