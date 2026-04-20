"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { useCallback, useEffect, useState } from "react";

type Bucket = {
  bucket_start: string;
  affiliate_id?: string | null;
  geo?: string | null;
  status?: string | null;
  accepted: number;
  rejected: number;
  duplicate: number;
};

type Interval = "1m" | "5m" | "1h";
type GroupBy = "" | "affiliate" | "geo" | "status";

const RANGES: { label: string; hours: number; interval: Interval }[] = [
  { label: "1h", hours: 1, interval: "1m" },
  { label: "24h", hours: 24, interval: "5m" },
  { label: "7d", hours: 24 * 7, interval: "1h" },
  { label: "30d", hours: 24 * 30, interval: "1h" },
];

function fmtNum(n: number) {
  return new Intl.NumberFormat().format(n);
}

export default function IntakeMetricsPage() {
  const { theme } = useThemeCtx();
  const [rangeIdx, setRangeIdx] = useState(1);
  const [groupBy, setGroupBy] = useState<GroupBy>("");
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    const r = RANGES[rangeIdx];
    const to = new Date();
    const from = new Date(to.getTime() - r.hours * 3600_000);
    const params = new URLSearchParams({
      from: from.toISOString(),
      to: to.toISOString(),
      interval: r.interval,
    });
    if (groupBy) params.set("group_by", groupBy);
    const res = await fetch(`/api/v1/intake/metrics?${params.toString()}`);
    if (!res.ok) {
      setErr((await res.json()).error?.code ?? `http ${res.status}`);
      setLoading(false);
      return;
    }
    const body = await res.json();
    setBuckets(body.buckets ?? []);
    setLoading(false);
  }, [rangeIdx, groupBy]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = buckets.reduce(
    (acc, b) => ({
      accepted: acc.accepted + b.accepted,
      rejected: acc.rejected + b.rejected,
      duplicate: acc.duplicate + b.duplicate,
    }),
    { accepted: 0, rejected: 0, duplicate: 0 },
  );
  const total = totals.accepted + totals.rejected + totals.duplicate;
  const acceptRate = total ? (totals.accepted / total) * 100 : 0;
  const rejectRate = total ? (totals.rejected / total) * 100 : 0;
  const dupRate = total ? (totals.duplicate / total) * 100 : 0;

  const timeSeries = groupBy
    ? aggregateByTime(buckets)
    : buckets.map((b) => ({
        ts: b.bucket_start,
        accepted: b.accepted,
        rejected: b.rejected,
        duplicate: b.duplicate,
      }));

  return (
    <div style={{ padding: "20px 28px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 14,
          marginBottom: 14,
          justifyContent: "space-between",
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Intake Metrics
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          {RANGES.map((r, i) => (
            <button
              key={r.label}
              type="button"
              style={{
                ...btnStyle(theme, rangeIdx === i ? "primary" : undefined),
                padding: "4px 12px",
                fontSize: 11,
              }}
              onClick={() => setRangeIdx(i)}
            >
              {r.label}
            </button>
          ))}
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            style={{ ...inputStyle(theme), width: 140 }}
          >
            <option value="">no grouping</option>
            <option value="affiliate">by affiliate</option>
            <option value="geo">by geo</option>
            <option value="status">by status</option>
          </select>
        </div>
      </div>

      {err && <div style={{ color: "oklch(72% 0.15 25)", fontSize: 12 }}>{err}</div>}
      {loading && <div style={{ color: "var(--fg-2)", fontSize: 12 }}>loading…</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(6, 1fr)",
          gap: 10,
          marginBottom: 18,
        }}
      >
        <Kpi label="total" value={fmtNum(total)} />
        <Kpi label="accepted" value={fmtNum(totals.accepted)} tone="success" />
        <Kpi label="rejected" value={fmtNum(totals.rejected)} tone="danger" />
        <Kpi label="duplicate" value={fmtNum(totals.duplicate)} />
        <Kpi label="accept rate" value={`${acceptRate.toFixed(1)}%`} tone="success" />
        <Kpi
          label="error rate"
          value={`${(rejectRate + dupRate).toFixed(1)}%`}
          tone={rejectRate + dupRate > 20 ? "danger" : undefined}
        />
      </div>

      <div
        style={{
          border: "1px solid var(--bd-1)",
          borderRadius: 6,
          padding: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 8 }}>
          Timeline (interval: {RANGES[rangeIdx].interval})
        </div>
        <StackBar series={timeSeries} />
      </div>

      {groupBy && (
        <div
          style={{
            border: "1px solid var(--bd-1)",
            borderRadius: 6,
            padding: 14,
          }}
        >
          <div style={{ fontSize: 11, color: "var(--fg-2)", marginBottom: 8 }}>
            Breakdown by {groupBy}
          </div>
          <GroupTable buckets={buckets} groupBy={groupBy} />
        </div>
      )}
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: { label: string; value: string; tone?: "success" | "danger" }) {
  const color =
    tone === "success"
      ? "oklch(72% 0.18 150)"
      : tone === "danger"
        ? "oklch(72% 0.15 25)"
        : "var(--fg-0)";
  return (
    <div style={{ padding: "14px 16px", border: "1px solid var(--bd-1)", borderRadius: 6 }}>
      <div
        style={{
          fontSize: 10,
          fontFamily: "var(--mono)",
          color: "var(--fg-2)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 500,
          marginTop: 4,
          fontVariantNumeric: "tabular-nums",
          color,
        }}
      >
        {value}
      </div>
    </div>
  );
}

type TsPoint = { ts: string; accepted: number; rejected: number; duplicate: number };

function aggregateByTime(buckets: Bucket[]): TsPoint[] {
  const map = new Map<string, TsPoint>();
  for (const b of buckets) {
    const prev = map.get(b.bucket_start) ?? {
      ts: b.bucket_start,
      accepted: 0,
      rejected: 0,
      duplicate: 0,
    };
    prev.accepted += b.accepted;
    prev.rejected += b.rejected;
    prev.duplicate += b.duplicate;
    map.set(b.bucket_start, prev);
  }
  return Array.from(map.values()).sort((a, b) => a.ts.localeCompare(b.ts));
}

function StackBar({ series }: { series: TsPoint[] }) {
  if (series.length === 0) {
    return <div style={{ color: "var(--fg-2)", fontSize: 12 }}>no data</div>;
  }
  const W = 800;
  const H = 160;
  const PAD = { t: 8, r: 8, b: 18, l: 28 };
  const max = Math.max(1, ...series.map((p) => p.accepted + p.rejected + p.duplicate));
  const bw = (W - PAD.l - PAD.r) / series.length;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ width: "100%", height: H, display: "block" }}
      role="img"
      aria-label="intake timeline"
    >
      {series.map((p, i) => {
        const total = p.accepted + p.rejected + p.duplicate;
        const x = PAD.l + i * bw + 1;
        const barW = Math.max(1, bw - 2);
        const scale = (H - PAD.t - PAD.b) / max;
        const hA = p.accepted * scale;
        const hR = p.rejected * scale;
        const hD = p.duplicate * scale;
        const base = H - PAD.b;
        const yA = base - hA;
        const yR = yA - hR;
        const yD = yR - hD;
        return (
          <g key={p.ts}>
            <rect x={x} y={yA} width={barW} height={hA} fill="oklch(72% 0.18 150)" opacity={0.9}>
              <title>
                {new Date(p.ts).toLocaleString()}
                {" · "}total {total} · acc {p.accepted} · rej {p.rejected} · dup {p.duplicate}
              </title>
            </rect>
            <rect x={x} y={yR} width={barW} height={hR} fill="oklch(72% 0.15 25)" opacity={0.9} />
            <rect x={x} y={yD} width={barW} height={hD} fill="var(--fg-2)" opacity={0.55} />
          </g>
        );
      })}
    </svg>
  );
}

function GroupTable({ buckets, groupBy }: { buckets: Bucket[]; groupBy: GroupBy }) {
  const agg = new Map<
    string,
    { key: string; accepted: number; rejected: number; duplicate: number }
  >();
  for (const b of buckets) {
    const key =
      groupBy === "affiliate"
        ? (b.affiliate_id ?? "—")
        : groupBy === "geo"
          ? (b.geo ?? "—")
          : (b.status ?? "—");
    const prev = agg.get(key) ?? { key, accepted: 0, rejected: 0, duplicate: 0 };
    prev.accepted += b.accepted;
    prev.rejected += b.rejected;
    prev.duplicate += b.duplicate;
    agg.set(key, prev);
  }
  const rows = Array.from(agg.values()).sort(
    (a, b) => b.accepted + b.rejected + b.duplicate - (a.accepted + a.rejected + a.duplicate),
  );
  return (
    <table style={{ width: "100%", fontSize: 12 }}>
      <thead>
        <tr
          style={{
            textAlign: "left",
            color: "var(--fg-2)",
            fontFamily: "var(--mono)",
            fontSize: 10,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <th style={{ padding: "6px 0" }}>{groupBy}</th>
          <th style={{ textAlign: "right" }}>accepted</th>
          <th style={{ textAlign: "right" }}>rejected</th>
          <th style={{ textAlign: "right" }}>duplicate</th>
          <th style={{ textAlign: "right" }}>accept %</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const total = r.accepted + r.rejected + r.duplicate;
          const pct = total ? (r.accepted / total) * 100 : 0;
          return (
            <tr key={r.key} style={{ borderTop: "1px solid var(--bd-1)" }}>
              <td style={{ padding: "6px 0", fontFamily: "var(--mono)" }}>{r.key}</td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {fmtNum(r.accepted)}
              </td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {fmtNum(r.rejected)}
              </td>
              <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                {fmtNum(r.duplicate)}
              </td>
              <td style={{ textAlign: "right" }}>
                <Pill size="xs" tone={pct >= 80 ? "success" : pct < 50 ? "danger" : undefined}>
                  {pct.toFixed(1)}%
                </Pill>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
