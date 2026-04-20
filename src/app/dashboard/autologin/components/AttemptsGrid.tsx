"use client";

import { useEffect, useState } from "react";

type Attempt = {
  id: string;
  status: "RUNNING" | "SUCCEEDED" | "FAILED";
  stage: "INITIATING" | "CAPTCHA" | "AUTHENTICATING" | "SESSION_READY";
  startedAt: string;
  durationMs: number | null;
  errorMessage: string | null;
  broker: { id: string; name: string } | null;
  lead: { id: string; traceId: string; email: string | null; geo: string } | null;
  proxyEndpoint: { id: string; label: string; country: string | null } | null;
};

function statusColor(status: Attempt["status"]): string {
  if (status === "SUCCEEDED") return "oklch(0.72 0.16 150)";
  if (status === "FAILED") return "oklch(0.65 0.20 25)";
  return "oklch(0.78 0.15 85)";
}

export function AttemptsGrid() {
  const [data, setData] = useState<Attempt[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/v1/autologin/attempts?limit=100")
      .then(async (r) => {
        if (!r.ok) throw new Error(`http_${r.status}`);
        return (await r.json()) as { attempts: Attempt[] };
      })
      .then((d) => {
        if (!cancelled) setData(d.attempts);
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
    <section className="rounded-md border border-border bg-surface">
      <header className="flex items-baseline justify-between px-4 py-3">
        <h3 className="text-[13px] font-medium">Recent attempts</h3>
        <span className="font-mono text-[10px] text-muted">{data.length} rows</span>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-t border-border/50 text-left">
              <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted">status</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted">stage</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted">broker</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted">trace</th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted">proxy</th>
              <th className="px-3 py-2 text-right font-mono text-[10px] uppercase text-muted">
                ms
              </th>
              <th className="px-3 py-2 font-mono text-[10px] uppercase text-muted">error</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id} className="border-t border-border/50 hover:bg-muted/10">
                <td
                  className="px-3 py-2 font-mono text-[11px]"
                  style={{ color: statusColor(a.status) }}
                >
                  {a.status}
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">{a.stage}</td>
                <td className="px-3 py-2">{a.broker?.name ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-[11px]">{a.lead?.traceId ?? "—"}</td>
                <td className="px-3 py-2 text-[11px]">{a.proxyEndpoint?.label ?? "—"}</td>
                <td className="px-3 py-2 text-right font-mono text-[11px] tabular-nums">
                  {a.durationMs ?? "— "}
                </td>
                <td className="max-w-[200px] truncate px-3 py-2 text-[11px] text-muted">
                  {a.errorMessage ?? ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
