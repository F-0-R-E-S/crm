"use client";

interface MiniBarsProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  gap?: number;
}

export function MiniBars({ values, width = 120, height = 28, color = "currentColor", gap = 2 }: MiniBarsProps) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const bw = (width - gap * (values.length - 1)) / values.length;
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      {values.map((v, i) => {
        const h = Math.max(1, (v / max) * height);
        return (
          <rect
            key={i}
            x={i * (bw + gap)}
            y={height - h}
            width={bw}
            height={h}
            fill={color}
            opacity={0.3 + 0.7 * (v / max)}
          />
        );
      })}
    </svg>
  );
}
