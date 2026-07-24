import { type ReactNode } from "react";
import { useT } from "./theme";

export default function Info({ label, value, last = false }: { label: ReactNode; value: ReactNode; last?: boolean }) {
  const T = useT();
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: last ? "none" : `1px solid ${T.border}` }}>
      <span style={{ color: T.metaDim }}>{label}</span>
      <span style={{ color: T.text, fontWeight: 500, textAlign: "right", maxWidth: "60%" }}>{value}</span>
    </div>
  );
}
