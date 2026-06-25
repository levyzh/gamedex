import { type ReactNode } from "react";
import Icon from "./Icon";
import { display, useT } from "./theme";

export default function Stat({ icon = null, label, value }: { icon?: string | null; label: ReactNode; value: ReactNode }) {
  const T = useT();
  return (
    <div>
      <div style={{ color: T.metaDim, fontSize: 11, fontWeight: 500, marginBottom: 3 }}>{label}</div>
      <div style={{ fontFamily: display, color: T.text, fontWeight: 600, fontSize: 18, display: "flex", alignItems: "center", gap: 5 }}>
        {icon && <Icon name={icon} size={15} color={T.accent} />}{value}
      </div>
    </div>
  );
}
