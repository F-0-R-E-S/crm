"use client";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import type { ReactNode } from "react";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  const { theme } = useThemeCtx();
  const fg = theme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: children render the control inside the label (implicit association)
    <label style={{ display: "block" }}>
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--mono)",
          color: fg,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          display: "block",
          marginBottom: 6,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
