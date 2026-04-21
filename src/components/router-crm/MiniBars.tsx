"use client";

interface MiniBarsProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  gap?: number;
}

export function MiniBars({
  values,
  width = 120,
  height = 28,
  color = "currentColor",
  gap = 2,
}: MiniBarsProps) {
  if (values.length === 0) return null;
  const max = Math.max(...values, 1);
  const bw = (width - gap * (values.length - 1)) / values.length;
  return (
    <svg
      width={width}
      height={height}
      style={{ display: "block" }}
      role="img"
      aria-label="mini bar chart"
    >
      <title>mini bar chart</title>
      {values.map((v, i) => {
        const h = Math.max(1, (v / max) * height);
        const x = i * (bw + gap);
        // Positional bars — index is a stable key here (values re-render as a full
        // replacement rather than an insert/reorder).
        return (
          <rect
            // biome-ignore lint/suspicious/noArrayIndexKey: positional SVG bars — index is stable by position
            key={i}
            x={x}
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
