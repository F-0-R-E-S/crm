"use client";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import type { FunnelCounts } from "@/lib/funnel-counts";

interface SankeyProps {
  counts: FunnelCounts;
  width?: number;
  height?: number;
}

interface ColItem {
  key: string;
  label: string;
  v: number;
  y: number;
  h: number;
  cy: number;
}
interface Col {
  x: number;
  label: string;
  items: ColItem[];
  total: number;
}

const NODE_COLORS: Record<string, string> = {
  received: "oklch(72% 0.03 250)",
  validated: "oklch(72% 0.12 220)",
  rejected: "oklch(62% 0.03 20)",
  routed: "oklch(72% 0.13 200)",
  no_broker: "oklch(62% 0.13 25)",
  ftd: "oklch(80% 0.17 135)",
  accepted: "oklch(74% 0.13 155)",
  declined: "oklch(70% 0.14 25)",
  failed: "oklch(62% 0.15 20)",
};

export function LeadFunnelSankey({ counts: c, width = 720, height = 240 }: SankeyProps) {
  const { theme } = useThemeCtx();
  const fg = theme === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)";
  const fgStrong = theme === "dark" ? "rgba(255,255,255,0.92)" : "rgba(0,0,0,0.92)";
  const padY = 20;
  const totalH = height - padY * 2;
  const barW = 10;

  const cols = [
    { x: 40, label: "Intake", items: [{ key: "received", label: "Received", v: c.received }] },
    {
      x: 240,
      label: "Validation",
      items: [
        { key: "validated", label: "Passed", v: c.validated },
        { key: "rejected", label: "Rejected", v: c.rejected },
      ],
    },
    {
      x: 440,
      label: "Routing",
      items: [
        { key: "routed", label: "Routed", v: c.routed },
        { key: "no_broker", label: "No broker", v: c.no_broker },
      ],
    },
    {
      x: 620,
      label: "Outcome",
      items: [
        { key: "ftd", label: "FTD", v: c.ftd },
        { key: "accepted", label: "Accepted", v: c.accepted },
        { key: "declined", label: "Declined", v: c.declined },
        { key: "failed", label: "Failed", v: c.push_failed },
      ],
    },
  ];

  const colsLaid: Col[] = cols.map((col) => {
    const total = col.items.reduce((a, b) => a + b.v, 0) || 1;
    let y = padY;
    const items: ColItem[] = col.items.map((item) => {
      const h = Math.max(2, (item.v / total) * totalH - 4);
      const r = { ...item, y, h, cy: y + h / 2 };
      y += h + 4;
      return r;
    });
    return { x: col.x, label: col.label, items, total };
  });

  const fA = colsLaid[0].items[0];
  const fB_pass = colsLaid[1].items[0];
  const fB_rej = colsLaid[1].items[1];
  const fC_rout = colsLaid[2].items[0];
  const fC_nob = colsLaid[2].items[1];
  const [fD_ftd, fD_acc, fD_dec, fD_fail] = colsLaid[3].items;

  const flows: { from: ColItem; to: ColItem; value: number; color: string }[] = [
    { from: fA, to: fB_pass, value: c.validated, color: NODE_COLORS.validated },
    { from: fA, to: fB_rej, value: c.rejected, color: NODE_COLORS.rejected },
    { from: fB_pass, to: fC_rout, value: c.routed, color: NODE_COLORS.routed },
    { from: fB_pass, to: fC_nob, value: c.no_broker, color: NODE_COLORS.no_broker },
    { from: fC_rout, to: fD_ftd, value: c.ftd, color: NODE_COLORS.ftd },
    { from: fC_rout, to: fD_acc, value: c.accepted, color: NODE_COLORS.accepted },
    { from: fC_rout, to: fD_dec, value: c.declined, color: NODE_COLORS.declined },
    { from: fC_rout, to: fD_fail, value: c.push_failed, color: NODE_COLORS.failed },
  ];

  const offOut = new Map<ColItem, number>();
  const offIn = new Map<ColItem, number>();
  const scaleFor = (it: ColItem) => (it.v > 0 ? it.h / it.v : 0);

  const paths = flows.map((f, idx) => {
    const sw = f.value * scaleFor(f.from);
    const tw = f.value * scaleFor(f.to);
    const sOff = offOut.get(f.from) ?? 0;
    const tOff = offIn.get(f.to) ?? 0;
    offOut.set(f.from, sOff + sw);
    offIn.set(f.to, tOff + tw);
    const x1 = colsLaid.find((col) => col.items.includes(f.from))!.x + barW;
    const x2 = colsLaid.find((col) => col.items.includes(f.to))!.x;
    const y1 = f.from.y + sOff + sw / 2;
    const y2 = f.to.y + tOff + tw / 2;
    const mx = (x1 + x2) / 2;
    const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
    return (
      <path
        key={idx}
        d={d}
        stroke={f.color}
        strokeWidth={Math.max(1, Math.min(sw, tw))}
        fill="none"
        opacity={0.35}
      />
    );
  });

  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      {paths}
      {colsLaid.map((col, ci) => (
        <g key={ci}>
          <text
            x={col.x}
            y={12}
            fill={fg}
            fontSize={10}
            fontFamily="var(--mono)"
            letterSpacing="0.1em"
          >
            {col.label.toUpperCase()}
          </text>
          {col.items.map((item, ii) => (
            <g key={ii}>
              <rect
                x={col.x}
                y={item.y}
                width={barW}
                height={item.h}
                fill={NODE_COLORS[item.key]}
                rx={1}
              />
              <text
                x={col.x + barW + 8}
                y={item.cy + 4}
                fill={fgStrong}
                fontSize={11}
                fontFamily="var(--sans)"
              >
                {item.label}
              </text>
              <text
                x={col.x + barW + 8}
                y={item.cy + 17}
                fill={fg}
                fontSize={10}
                fontFamily="var(--mono)"
              >
                {item.v.toLocaleString()}
              </text>
            </g>
          ))}
        </g>
      ))}
    </svg>
  );
}
