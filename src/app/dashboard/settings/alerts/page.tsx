"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

type AckFilter = "all" | "acked" | "unacked";

export default function AlertsPage() {
  const { theme } = useThemeCtx();
  const [ruleKey, setRuleKey] = useState("");
  const [ack, setAck] = useState<AckFilter>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.alertLog.list.useQuery({
    page,
    ruleKey: ruleKey || undefined,
    ack,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });

  const ackMutation = trpc.alertLog.ack.useMutation({
    onSuccess: () => {
      utils.alertLog.list.invalidate();
    },
  });

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1200 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 4px" }}>
        Alerts
      </h1>
      <p style={{ fontSize: 12, color: "var(--fg-2)", margin: "0 0 16px" }}>
        Review and acknowledge alerts raised by the alert-evaluator cron. Acking stamps your user id
        and timestamp; it does not resolve the underlying condition.
      </p>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
            rule key
          </span>
          <input
            value={ruleKey}
            onChange={(e) => {
              setRuleKey(e.target.value);
              setPage(1);
            }}
            placeholder="e.g. intake_error_rate"
            style={{ ...inputStyle(theme), width: 240 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>ack</span>
          <select
            value={ack}
            onChange={(e) => {
              setAck(e.target.value as AckFilter);
              setPage(1);
            }}
            style={{ ...inputStyle(theme), width: 130 }}
          >
            <option value="all">all</option>
            <option value="unacked">unacked</option>
            <option value="acked">acked</option>
          </select>
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
            from
          </span>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setPage(1);
            }}
            style={{ ...inputStyle(theme), width: 200 }}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span style={{ fontSize: 10, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>to</span>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setPage(1);
            }}
            style={{ ...inputStyle(theme), width: 200 }}
          />
        </label>
      </div>

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
            <th style={{ padding: "8px 0" }}>triggered</th>
            <th>rule</th>
            <th>severity</th>
            <th>message</th>
            <th>ack</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {isLoading && (
            <tr>
              <td
                colSpan={6}
                style={{
                  padding: "12px 0",
                  color: "var(--fg-2)",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                }}
              >
                loading…
              </td>
            </tr>
          )}
          {data?.items.length === 0 && !isLoading && (
            <tr>
              <td
                colSpan={6}
                style={{
                  padding: "12px 0",
                  color: "var(--fg-2)",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                }}
              >
                no alerts match the current filter.
              </td>
            </tr>
          )}
          {data?.items.map((row) => (
            <tr key={row.id} style={{ borderTop: "1px solid var(--bd-1)", verticalAlign: "top" }}>
              <td
                style={{
                  padding: "8px 0",
                  fontFamily: "var(--mono)",
                  color: "var(--fg-2)",
                  fontSize: 11,
                }}
              >
                {new Date(row.triggeredAt).toLocaleString()}
              </td>
              <td>
                <code style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{row.ruleKey}</code>
              </td>
              <td>
                <Pill size="xs" tone={row.severity === "critical" ? "danger" : "warn"}>
                  {row.severity}
                </Pill>
              </td>
              <td style={{ maxWidth: 420 }}>{row.message}</td>
              <td>
                {row.ackedAt ? (
                  <div style={{ fontFamily: "var(--mono)", fontSize: 10, color: "var(--fg-2)" }}>
                    <div>{new Date(row.ackedAt).toLocaleString()}</div>
                    {row.ackedBy && <div>by {row.ackedBy.slice(0, 8)}…</div>}
                  </div>
                ) : (
                  <Pill size="xs" tone="warn">
                    pending
                  </Pill>
                )}
              </td>
              <td>
                {!row.ackedAt && (
                  <button
                    type="button"
                    onClick={() => ackMutation.mutate({ id: row.id })}
                    disabled={ackMutation.isPending}
                    style={{ ...btnStyle(theme), padding: "2px 10px", fontSize: 11 }}
                  >
                    Ack
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: "flex", gap: 8, marginTop: 16, alignItems: "center" }}>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          style={{ ...btnStyle(theme), opacity: page <= 1 ? 0.4 : 1 }}
        >
          Prev
        </button>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-2)" }}>
          Page {page}
        </span>
        <button
          type="button"
          disabled={(data?.items.length ?? 0) < (data?.pageSize ?? 50)}
          onClick={() => setPage((p) => p + 1)}
          style={{
            ...btnStyle(theme),
            opacity: (data?.items.length ?? 0) < (data?.pageSize ?? 50) ? 0.4 : 1,
          }}
        >
          Next
        </button>
        <span
          style={{ marginLeft: 16, fontFamily: "var(--mono)", fontSize: 11, color: "var(--fg-2)" }}
        >
          {data?.total ?? 0} total
        </span>
      </div>
    </div>
  );
}
