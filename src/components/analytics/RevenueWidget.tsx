"use client";

export interface RevenueWidgetProps {
  data?: {
    rows: Array<{ bucket: string; revenue: number; ftds: number; pushed: number }>;
    total: { revenue: number; ftds: number; pushed: number };
  };
  onBucketClick?: (bucket: string) => void;
}

export function RevenueWidget({ data, onBucketClick }: RevenueWidgetProps) {
  const rows = (data?.rows ?? []).slice(0, 12);
  const total = data?.total ?? { revenue: 0, ftds: 0, pushed: 0 };
  const max = rows.reduce((m, r) => Math.max(m, r.revenue), 0);
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
          Revenue by bucket{" "}
          {onBucketClick ? <span style={{ fontSize: 10 }}>· click row to drill</span> : null}
        </span>
        <span>
          ${Math.round(total.revenue).toLocaleString()} · {total.ftds} FTDs
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {rows.map((r) => {
          const pct = max === 0 ? 0 : (r.revenue / max) * 100;
          const clickable = typeof onBucketClick === "function";
          return (
            <div
              key={r.bucket}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onClick={clickable ? () => onBucketClick?.(r.bucket) : undefined}
              onKeyDown={
                clickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") onBucketClick?.(r.bucket);
                    }
                  : undefined
              }
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr 80px 40px",
                gap: 8,
                alignItems: "center",
                padding: "3px 4px",
                fontSize: 11,
                cursor: clickable ? "pointer" : undefined,
              }}
            >
              <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>
                {r.bucket.slice(0, 16)}
              </span>
              <div
                style={{
                  background: "var(--bd-1)",
                  borderRadius: 2,
                  height: 10,
                  position: "relative",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${pct}%`,
                    background: "oklch(72% 0.17 145)",
                    borderRadius: 2,
                  }}
                />
              </div>
              <span style={{ fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
                ${Math.round(r.revenue).toLocaleString()}
              </span>
              <span
                style={{
                  fontVariantNumeric: "tabular-nums",
                  textAlign: "right",
                  color: "var(--fg-2)",
                }}
              >
                {r.ftds}
              </span>
            </div>
          );
        })}
        {rows.length === 0 ? (
          <div style={{ fontSize: 12, color: "var(--fg-2)", padding: 12, textAlign: "center" }}>
            No revenue rows for the selected filters.
          </div>
        ) : null}
      </div>
    </div>
  );
}
