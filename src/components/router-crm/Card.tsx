"use client";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  subtitle?: string;
  padding?: number;
  right?: ReactNode;
  children: ReactNode;
}

export function Card({ title, subtitle, padding = 18, right, children }: CardProps) {
  const { theme } = useThemeCtx();
  const bg = theme === "dark" ? "rgba(255,255,255,0.02)" : "#fff";
  const bd = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const fg = theme === "dark" ? "var(--fg-0)" : "var(--ink)";
  const fgMuted = theme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";

  return (
    <section
      style={{ background: bg, border: `1px solid ${bd}`, borderRadius: 6, overflow: "hidden" }}
    >
      {(title || right) && (
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderBottom: `1px solid ${bd}`,
          }}
        >
          <div>
            {title && (
              <div style={{ fontSize: 13, fontWeight: 500, color: fg, letterSpacing: "-0.01em" }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div
                style={{ fontSize: 11, fontFamily: "var(--mono)", color: fgMuted, marginTop: 2 }}
              >
                {subtitle}
              </div>
            )}
          </div>
          {right}
        </header>
      )}
      <div style={{ padding }}>{children}</div>
    </section>
  );
}
