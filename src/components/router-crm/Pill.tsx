"use client";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import type { Tone } from "@/lib/tokens";
import type { CSSProperties, ReactNode } from "react";

interface PillProps {
  children: ReactNode;
  tone?: Tone;
  solid?: boolean;
  size?: "xs" | "sm";
}

const DARK_COLORS: Record<Tone, { bg: string; fg: string; bd: string }> = {
  neutral: {
    bg: "rgba(255,255,255,0.06)",
    fg: "rgba(255,255,255,0.75)",
    bd: "rgba(255,255,255,0.08)",
  },
  success: {
    bg: "rgba(120,210,150,0.10)",
    fg: "oklch(82% 0.14 150)",
    bd: "oklch(50% 0.10 150 / 0.4)",
  },
  warn: { bg: "rgba(230,180,80,0.10)", fg: "oklch(82% 0.15 75)", bd: "oklch(55% 0.10 75 / 0.4)" },
  danger: {
    bg: "rgba(220,100,100,0.10)",
    fg: "oklch(75% 0.15 25)",
    bd: "oklch(50% 0.12 25 / 0.4)",
  },
  info: {
    bg: "rgba(120,180,230,0.10)",
    fg: "oklch(78% 0.13 220)",
    bd: "oklch(50% 0.10 220 / 0.4)",
  },
  accent: {
    bg: "rgba(200,170,240,0.10)",
    fg: "oklch(80% 0.12 290)",
    bd: "oklch(55% 0.10 290 / 0.4)",
  },
};

const LIGHT_COLORS: Record<Tone, { bg: string; fg: string; bd: string }> = {
  neutral: { bg: "rgba(0,0,0,0.04)", fg: "rgba(0,0,0,0.70)", bd: "rgba(0,0,0,0.08)" },
  success: { bg: "oklch(96% 0.03 150)", fg: "oklch(40% 0.14 150)", bd: "oklch(85% 0.08 150)" },
  warn: { bg: "oklch(96% 0.04 75)", fg: "oklch(42% 0.14 75)", bd: "oklch(85% 0.08 75)" },
  danger: { bg: "oklch(96% 0.03 25)", fg: "oklch(45% 0.17 25)", bd: "oklch(85% 0.08 25)" },
  info: { bg: "oklch(96% 0.03 220)", fg: "oklch(42% 0.14 220)", bd: "oklch(85% 0.08 220)" },
  accent: { bg: "oklch(96% 0.03 290)", fg: "oklch(45% 0.12 290)", bd: "oklch(85% 0.06 290)" },
};

export function Pill({ children, tone = "neutral", solid = false, size = "sm" }: PillProps) {
  const { theme } = useThemeCtx();
  const c = theme === "dark" ? DARK_COLORS[tone] : LIGHT_COLORS[tone];
  const padY = size === "xs" ? 1 : 2;
  const padX = size === "xs" ? 5 : 7;
  const fs = size === "xs" ? 10 : 11;
  const style: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    padding: `${padY}px ${padX}px`,
    fontSize: fs,
    fontFamily: "var(--mono)",
    fontWeight: 500,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    color: solid ? "#000" : c.fg,
    background: solid ? c.fg : c.bg,
    border: `1px solid ${c.bd}`,
    borderRadius: 3,
    whiteSpace: "nowrap",
    lineHeight: 1.3,
  };
  return <span style={style}>{children}</span>;
}
