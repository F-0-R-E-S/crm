"use client";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { DeltaBadge, classifyDelta } from "./DeltaBadge";

export interface MetricTileProps {
  label: string;
  value: number;
  deltaPct?: number | null;
  series: Array<{ bucket: string; value: number }>;
  format?: "number" | "currency" | "percent";
  onClick?: () => void;
}

function formatValue(v: number, fmt: MetricTileProps["format"] = "number"): string {
  if (fmt === "currency") return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (fmt === "percent") return `${(v * 100).toFixed(1)}%`;
  return v.toLocaleString();
}

const SPARK_COLOR: Record<ReturnType<typeof classifyDelta>, string> = {
  up: "oklch(72% 0.17 145)",
  flat: "oklch(78% 0.11 85)",
  down: "oklch(63% 0.22 25)",
  unknown: "currentColor",
};

export function MetricTile({
  label,
  value,
  deltaPct,
  series,
  format = "number",
  onClick,
}: MetricTileProps) {
  const tone = classifyDelta(deltaPct);
  const sparkStroke = SPARK_COLOR[tone];
  const clickable = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") onClick?.();
            }
          : undefined
      }
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      style={{
        border: "1px solid var(--bd-1)",
        borderRadius: 4,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        background: "var(--bg-2)",
        cursor: clickable ? "pointer" : undefined,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--mono)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--fg-2)",
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <span style={{ fontSize: 22, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
          {formatValue(value, format)}
        </span>
        <DeltaBadge deltaPct={deltaPct} />
      </div>
      <div style={{ height: 40 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series}>
            <Line
              dataKey="value"
              stroke={sparkStroke}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
