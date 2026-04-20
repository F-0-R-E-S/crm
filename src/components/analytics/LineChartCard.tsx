"use client";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface SeriesPoint {
  bucket: string;
  value: number;
}

export interface LineChartCardProps {
  title: string;
  current: SeriesPoint[];
  compare?: SeriesPoint[] | null;
  height?: number;
}

interface MergedRow {
  bucket: string;
  current: number | null;
  compare?: number | null;
}

function mergeSeries(a: SeriesPoint[], b: SeriesPoint[] | null | undefined): MergedRow[] {
  const len = Math.max(a.length, b?.length ?? 0);
  const out: MergedRow[] = [];
  for (let i = 0; i < len; i++) {
    out.push({
      bucket: a[i]?.bucket ?? b?.[i]?.bucket ?? String(i),
      current: a[i]?.value ?? null,
      compare: b ? (b[i]?.value ?? null) : undefined,
    });
  }
  return out;
}

function fmtBucket(v: string): string {
  if (typeof v === "string" && v.length >= 10 && v[4] === "-") return v.slice(0, 10);
  return String(v);
}

export function LineChartCard({
  title,
  current,
  compare = null,
  height = 260,
}: LineChartCardProps) {
  const data = mergeSeries(current, compare);
  const hasCompare = Array.isArray(compare) && compare.length > 0;
  return (
    <div
      style={{
        border: "1px solid var(--bd-1)",
        borderRadius: 4,
        padding: 12,
        background: "var(--bg-2)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontFamily: "var(--mono)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--fg-2)",
          marginBottom: 6,
        }}
      >
        {title}
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid vertical={false} strokeDasharray="2 2" stroke="var(--bd-1)" />
            <XAxis dataKey="bucket" tickFormatter={fmtBucket} minTickGap={30} fontSize={10} />
            <YAxis width={40} fontSize={10} />
            <Tooltip />
            <Legend />
            <Line
              dataKey="current"
              stroke="var(--accent, oklch(76% 0.12 220))"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            {hasCompare ? (
              <Line
                dataKey="compare"
                stroke="var(--fg-2)"
                strokeDasharray="4 3"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
