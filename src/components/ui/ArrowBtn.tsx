import Icon from "./Icon";
import { useT } from "../../lib/theme";

// ─── Carousel row (4.5 cards, hover arrows, View More) ─────────────────────────
export default function ArrowBtn({ dir, onClick }: { dir: "left" | "right"; onClick: () => void }) {
  const T = useT();
  return (
    <button onClick={onClick} aria-label={dir === "left" ? "Previous" : "Next"}
      style={{
        position: "absolute", top: "42%", transform: "translateY(-50%)",
        [dir]: -8, width: 38, height: 38, borderRadius: "50%",
        border: `1px solid ${T.borderH}`, background: T.surface, color: T.text,
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: T.shadowH, zIndex: 5,
      }}>
      <Icon name={dir === "left" ? "back" : "next"} size={18} />
    </button>
  );
}
