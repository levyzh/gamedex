import WelcomeBanner from "./WelcomeBanner";
import CategoryRow from "./CategoryRow";
import { CATEGORY } from "./rawg";
import type { Game } from "./types";

// ─── Home page (MyAnimeList homepage layout) ───────────────────────────────────
export default function HomePage({ popular, fresh, acclaimed, onOpen, onViewMore, showWelcome, onDismissWelcome }: { popular: Game[]; fresh: Game[]; acclaimed: Game[]; onOpen: (g: Game) => void; onViewMore: (key: string) => void; showWelcome: boolean; onDismissWelcome: () => void }) {
  return (
    <div>
      {showWelcome ? <WelcomeBanner onDismiss={onDismissWelcome} /> : null}
      <CategoryRow title={CATEGORY.popular.title}   games={popular}   onOpen={onOpen} onViewMore={() => onViewMore("popular")} />
      <CategoryRow title={CATEGORY.fresh.title}     games={fresh}     onOpen={onOpen} onViewMore={() => onViewMore("fresh")} />
      <CategoryRow title={CATEGORY.acclaimed.title} games={acclaimed} onOpen={onOpen} onViewMore={() => onViewMore("acclaimed")} />
    </div>
  );
}
