"use client";
import { useThemeCtx } from "@/components/shell/ThemeProvider";

export function CodeBlock({ data, label }: { data: unknown; label?: string }) {
  const { theme } = useThemeCtx();
  const bg = theme === "dark" ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const bd = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const fg = theme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  return (
    <div>
      {label && <div style={{ fontSize: 10, fontFamily: "var(--mono)", color: fg, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>}
      <pre style={{ margin: 0, padding: 12, background: bg, border: `1px solid ${bd}`, borderRadius: 4, fontSize: 11, fontFamily: "var(--mono)", overflow: "auto", maxHeight: 340 }}>
        {typeof data === "string" ? data : JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
