"use client";

import { useEffect, useState } from "react";

type SlaPayload = {
  total: number;
  successful: number;
  failed: number;
  uptime_pct: number;
  p50_duration_ms: number | null;
  p95_duration_ms: number | null;
  by_stage_failed: {
    INITIATING: number;
    CAPTCHA: number;
    AUTHENTICATING: number;
    SESSION_READY: number;
  };
};

function uptimeColor(pct: number): string {
  if (pct >= 99.5) return "oklch(0.72 0.16 150)";
  if (pct >= 95) return "oklch(0.78 0.15 85)";
  return "oklch(0.65 0.20 25)";
}

export function SlaTile() {
  const [data, setData] = useState<SlaPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/autologin/sla")
      .then(async (r) => {
        if (!r.ok) throw new Error(`http_${r.status}`);
        return (await r.json()) as SlaPayload;
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setErr(e instanceof Error ? e.message : "error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (err) {
    return (
      <section className="rounded-md border border-border bg-surface p-4 text-[11px] text-muted">
        error: {err}
      </section>
    );
  }
  if (!data) {
    return (
      <section className="rounded-md border border-border bg-surface p-4 text-[11px] text-muted">
        loading…
      </section>
    );
  }

  return (
    <section className="space-y-3 rounded-md border border-border bg-surface p-4">
      <header className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-medium">Autologin SLA — last 7 days</h2>
        <span className="font-mono text-[10px] text-muted">{data.total} attempts</span>
      </header>
      <div className="grid grid-cols-4 gap-4">
        <div>
          <div className="text-[10px] font-mono uppercase text-muted">uptime</div>
          <div
            className="font-mono text-[20px] tabular-nums"
            style={{ color: uptimeColor(data.uptime_pct) }}
          >
            {data.uptime_pct.toFixed(2)}%
          </div>
          <div className="text-[10px] text-muted">target 99.50%</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase text-muted">successful</div>
          <div className="font-mono text-[20px] tabular-nums">{data.successful}</div>
          <div className="text-[10px] text-muted">of {data.total}</div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase text-muted">p50 / p95</div>
          <div className="font-mono text-[13px] tabular-nums">
            {data.p50_duration_ms ?? "— "} / {data.p95_duration_ms ?? "— "} ms
          </div>
        </div>
        <div>
          <div className="text-[10px] font-mono uppercase text-muted">fail by stage</div>
          <div className="space-x-2 font-mono text-[11px] tabular-nums">
            <span>I:{data.by_stage_failed.INITIATING}</span>
            <span>C:{data.by_stage_failed.CAPTCHA}</span>
            <span>A:{data.by_stage_failed.AUTHENTICATING}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
