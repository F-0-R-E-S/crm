"use client";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import type { CSSProperties } from "react";

interface Tab<K extends string> {
  key: K;
  label: string;
}

export function TabStrip<K extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: Tab<K>[];
  active: K;
  onChange: (k: K) => void;
}) {
  const { theme } = useThemeCtx();
  const bd = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const fg = theme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const fgStrong = theme === "dark" ? "var(--fg-0)" : "var(--ink)";

  return (
    <div style={{ display: "flex", gap: 2, borderBottom: `1px solid ${bd}`, marginBottom: 16 }}>
      {tabs.map((t) => {
        const on = t.key === active;
        const style: CSSProperties = {
          padding: "8px 14px",
          background: "transparent",
          border: "none",
          borderBottom: on ? `2px solid ${fgStrong}` : "2px solid transparent",
          marginBottom: -1,
          color: on ? fgStrong : fg,
          fontSize: 12,
          fontFamily: "var(--sans)",
          fontWeight: on ? 500 : 400,
          cursor: "pointer",
        };
        return (
          <button key={t.key} type="button" style={style} onClick={() => onChange(t.key)}>
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
