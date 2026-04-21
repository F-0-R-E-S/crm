"use client";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface RejectsWidgetProps {
  data?: {
    byReason: Array<{ reason: string; count: number }>;
    total: number;
  };
  onReasonClick?: (reason: string) => void;
}

export function RejectsWidget({ data, onReasonClick }: RejectsWidgetProps) {
  const rows = (data?.byReason ?? []).slice(0, 12);
  const total = data?.total ?? 0;
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
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>
          Rejects by reason{" "}
          {onReasonClick ? <span style={{ fontSize: 10 }}>· click bar to drill</span> : null}
        </span>
        {total > 0 ? <span>{total} total</span> : null}
      </div>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical">
            <XAxis type="number" hide />
            <YAxis dataKey="reason" type="category" width={120} fontSize={11} />
            <Tooltip />
            <Bar
              dataKey="count"
              fill="var(--danger, oklch(63% 0.22 25))"
              isAnimationActive={false}
              cursor={onReasonClick ? "pointer" : undefined}
              onClick={(p) => {
                if (!onReasonClick) return;
                const reason = (p as { reason?: string } | undefined)?.reason;
                if (reason) onReasonClick(reason);
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
