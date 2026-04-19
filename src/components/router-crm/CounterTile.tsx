"use client";
import { Sparkline } from "./Sparkline";
import { useThemeCtx } from "@/components/shell/ThemeProvider";

interface CounterTileProps {
  label: string;
  value: number | string;
  delta?: number;
  spark?: number[];
  sparkColor?: string;
  accent?: string;
  onClick?: () => void;
}

export function CounterTile({ label, value, delta, spark, sparkColor, accent, onClick }: CounterTileProps) {
  const { theme } = useThemeCtx();
  const bd = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const bg = theme === "dark" ? "rgba(255,255,255,0.02)" : "#fff";
  const fg = theme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const fgStrong = theme === "dark" ? "var(--fg-0)" : "var(--ink)";
  const deltaColor = (delta ?? 0) >= 0 ? "oklch(75% 0.14 150)" : "oklch(72% 0.15 25)";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", flexDirection: "column", gap: 12,
        padding: "16px 18px", background: bg,
        border: `1px solid ${bd}`, borderRadius: 6,
        textAlign: "left", cursor: onClick ? "pointer" : "default",
        fontFamily: "inherit", color: "inherit",
        transition: "border-color 120ms",
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = accent ?? (theme === "dark" ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"); }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = bd; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: fg, textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label}
        </span>
        {delta != null && (
          <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: deltaColor }}>
            {delta >= 0 ? "↑" : "↓"} {Math.abs(delta)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 32, fontWeight: 500, color: fgStrong, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
      </div>
      {spark && <Sparkline points={spark} stroke={sparkColor ?? accent ?? "currentColor"} width={160} height={24} />}
    </button>
  );
}
