import { type ReactNode } from "react";
import { display, useT } from "../../lib/theme";

// ─── Section header ────────────────────────────────────────────────────────────
export default function SectionHeader({ title, action = null }: { title: ReactNode; action?: ReactNode }) {
  const T = useT();
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "26px 0 12px" }}>
      <h2 style={{ fontFamily: display, fontWeight: 600, fontSize: 16, color: T.text, letterSpacing: "-0.01em" }}>{title}</h2>
      {action && <span style={{ color: T.link, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>{action}</span>}
    </div>
  );
}
