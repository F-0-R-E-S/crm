"use client";
import { stateColor, type LeadStateKey } from "@/lib/tokens";
import { useThemeCtx } from "@/components/shell/ThemeProvider";

interface DotProps {
  state: LeadStateKey;
  size?: number;
}

export function Dot({ state, size = 6 }: DotProps) {
  const { theme } = useThemeCtx();
  const c = stateColor(state, theme);
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: size,
        background: c,
        display: "inline-block",
        flexShrink: 0,
        boxShadow: state === "FTD" ? `0 0 0 3px ${c}22` : "none",
      }}
    />
  );
}
