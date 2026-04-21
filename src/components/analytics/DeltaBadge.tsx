"use client";

export type DeltaTone = "up" | "flat" | "down" | "unknown";

export function classifyDelta(deltaPct: number | null | undefined, flatEpsilon = 0.5): DeltaTone {
  if (deltaPct == null || Number.isNaN(deltaPct)) return "unknown";
  if (Math.abs(deltaPct) < flatEpsilon) return "flat";
  return deltaPct > 0 ? "up" : "down";
}

const COLORS: Record<DeltaTone, string> = {
  up: "oklch(72% 0.17 145)",
  flat: "oklch(78% 0.11 85)",
  down: "oklch(63% 0.22 25)",
  unknown: "var(--fg-2)",
};

export function DeltaBadge({
  deltaPct,
  flatEpsilon = 0.5,
}: {
  deltaPct: number | null | undefined;
  flatEpsilon?: number;
}) {
  const tone = classifyDelta(deltaPct, flatEpsilon);
  if (tone === "unknown") {
    return (
      <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: COLORS.unknown }}>—</span>
    );
  }
  const sign = tone === "up" ? "+" : "";
  return (
    <span
      style={{
        fontSize: 11,
        fontFamily: "var(--mono)",
        color: COLORS[tone],
        fontVariantNumeric: "tabular-nums",
      }}
      data-tone={tone}
    >
      {sign}
      {(deltaPct ?? 0).toFixed(1)}%
    </span>
  );
}
