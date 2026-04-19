"use client";
import type { ReactNode } from "react";
import { useThemeCtx } from "@/components/shell/ThemeProvider";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  const { theme } = useThemeCtx();
  const fg = theme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  return (
    <label style={{ display: "block" }}>
      <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: fg, letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
        {label}
      </span>
      {children}
    </label>
  );
}
