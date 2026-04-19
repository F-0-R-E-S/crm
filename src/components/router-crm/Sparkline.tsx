"use client";

interface SparklineProps {
  points: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
}

export function Sparkline({ points, width = 100, height = 22, stroke = "currentColor", fill }: SparklineProps) {
  if (points.length === 0) return null;
  const max = Math.max(...points, 1);
  const min = Math.min(...points, 0);
  const range = max - min || 1;
  const n = points.length;
  const xs = points.map((_, i) => (n === 1 ? width / 2 : (i / (n - 1)) * width));
  const ys = points.map(p => height - ((p - min) / range) * height * 0.85 - height * 0.08);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(" ");
  const area = `${d} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} style={{ display: "block", overflow: "visible" }}>
      {fill && <path d={area} fill={fill} />}
      <path d={d} fill="none" stroke={stroke} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
