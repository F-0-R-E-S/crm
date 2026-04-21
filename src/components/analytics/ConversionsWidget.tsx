"use client";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface ConversionsWidgetProps {
  data?: {
    stages: {
      received: number;
      validated: number;
      rejected?: number;
      pushed: number;
      accepted: number;
      declined?: number;
      ftd: number;
    };
  };
  onStageClick?: (stage: "received" | "validated" | "pushed" | "accepted" | "ftd") => void;
}

const COLORS = ["#60a5fa", "#93c5fd", "#a78bfa", "#34d399", "#22c55e"];
const STAGES = ["received", "validated", "pushed", "accepted", "ftd"] as const;

export function ConversionsWidget({ data, onStageClick }: ConversionsWidgetProps) {
  const s = data?.stages ?? { received: 0, validated: 0, pushed: 0, accepted: 0, ftd: 0 };
  const rows = [
    { name: "Received", value: s.received, key: "received" as const },
    { name: "Validated", value: s.validated, key: "validated" as const },
    { name: "Pushed", value: s.pushed, key: "pushed" as const },
    { name: "Accepted", value: s.accepted, key: "accepted" as const },
    { name: "FTD", value: s.ftd, key: "ftd" as const },
  ];

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
        Conversion funnel{" "}
        {onStageClick ? <span style={{ fontSize: 10 }}>· click bar to drill</span> : null}
      </div>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical">
            <XAxis type="number" hide />
            <YAxis dataKey="name" type="category" width={80} fontSize={11} />
            <Tooltip />
            <Bar
              dataKey="value"
              isAnimationActive={false}
              cursor={onStageClick ? "pointer" : undefined}
              onClick={(p) => {
                if (!onStageClick) return;
                const key = (p as { key?: (typeof STAGES)[number] } | undefined)?.key;
                if (key) onStageClick(key);
              }}
            >
              {rows.map((r, i) => (
                <Cell key={`cell-${r.name}`} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
