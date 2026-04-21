"use client";
import { Pill, btnStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { use, useMemo, useState } from "react";

type Category = "NEW" | "QUALIFIED" | "REJECTED" | "CONVERTED";

const CAT_TONE: Record<Category, "success" | "warn" | "danger" | "neutral"> = {
  NEW: "neutral",
  QUALIFIED: "success",
  REJECTED: "danger",
  CONVERTED: "success",
};

export default function StatusMappingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data: broker } = trpc.broker.byId.useQuery({ id });
  const { data: canonicals = [] } = trpc.statusMapping.listCanonical.useQuery();
  const { data: observed = [] } = trpc.statusMapping.observedRawStatuses.useQuery({ brokerId: id });
  const { data: coverage } = trpc.statusMapping.coverageForBroker.useQuery({ brokerId: id });

  const upsert = trpc.statusMapping.upsert.useMutation({
    onSuccess: () => {
      utils.statusMapping.observedRawStatuses.invalidate({ brokerId: id });
      utils.statusMapping.coverageForBroker.invalidate({ brokerId: id });
    },
  });
  const bulkUpsert = trpc.statusMapping.bulkUpsert.useMutation({
    onSuccess: () => {
      utils.statusMapping.observedRawStatuses.invalidate({ brokerId: id });
      utils.statusMapping.coverageForBroker.invalidate({ brokerId: id });
    },
  });
  const backfill = trpc.statusMapping.backfillLeads.useMutation();
  const { data: suggestions = [] } = trpc.statusMapping.suggestFor.useQuery({ brokerId: id });

  const [filter, setFilter] = useState<"all" | "unmapped">("all");

  const rows = useMemo(() => {
    if (filter === "unmapped") return observed.filter((r) => !r.mapping);
    return observed;
  }, [observed, filter]);

  const unmappedCount = observed.filter((r) => !r.mapping).length;

  return (
    <div style={{ padding: "20px 28px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          Status mapping
        </h1>
        <Link
          href={`/dashboard/brokers/${id}` as never}
          style={{ fontSize: 11, color: "var(--fg-2)", textDecoration: "none" }}
        >
          ← broker
        </Link>
        {broker && (
          <span style={{ fontSize: 12, color: "var(--fg-2)", fontFamily: "var(--mono)" }}>
            {broker.name}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 14, marginBottom: 14, flexWrap: "wrap" }}>
        <div
          style={{
            padding: "10px 14px",
            border: "1px solid var(--bd-1)",
            borderRadius: 6,
            minWidth: 160,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--mono)",
              color: "var(--fg-2)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            coverage
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
            {coverage ? `${Math.round(coverage.coveragePct * 100)}%` : "—"}
          </div>
        </div>
        <div
          style={{
            padding: "10px 14px",
            border: "1px solid var(--bd-1)",
            borderRadius: 6,
            minWidth: 160,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontFamily: "var(--mono)",
              color: "var(--fg-2)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            unmapped
          </div>
          <div style={{ fontSize: 24, fontWeight: 500, fontVariantNumeric: "tabular-nums" }}>
            {unmappedCount}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button
          type="button"
          style={btnStyle(theme, filter === "all" ? "primary" : undefined)}
          onClick={() => setFilter("all")}
        >
          all ({observed.length})
        </button>
        <button
          type="button"
          style={btnStyle(theme, filter === "unmapped" ? "primary" : undefined)}
          onClick={() => setFilter("unmapped")}
        >
          unmapped ({unmappedCount})
        </button>
        <button
          type="button"
          style={btnStyle(theme)}
          disabled={suggestions.length === 0 || bulkUpsert.isPending}
          onClick={() => {
            if (suggestions.length === 0) return;
            bulkUpsert.mutate({
              brokerId: id,
              items: suggestions.map((s) => ({
                rawStatus: s.rawStatus,
                canonicalStatusId: s.canonicalStatusId,
              })),
            });
          }}
        >
          apply suggested ({suggestions.length})
        </button>
        <button
          type="button"
          style={btnStyle(theme)}
          disabled={backfill.isPending}
          onClick={() => backfill.mutate({ brokerId: id })}
        >
          remap existing leads
        </button>
      </div>
      {backfill.data && (
        <div
          style={{
            fontSize: 11,
            color: "var(--fg-2)",
            marginBottom: 10,
            fontFamily: "var(--mono)",
          }}
        >
          backfilled · updated={backfill.data.updated} · unmapped={backfill.data.unmapped}
        </div>
      )}

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
            <th style={{ padding: "8px 0" }}>raw</th>
            <th>count 30d</th>
            <th>canonical</th>
            <th>category</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.rawStatus} style={{ borderTop: "1px solid var(--bd-1)" }}>
              <td style={{ padding: "8px 0", fontFamily: "var(--mono)" }}>{r.rawStatus}</td>
              <td style={{ fontFamily: "var(--mono)", color: "var(--fg-2)" }}>{r.count}</td>
              <td>
                <select
                  value={r.mapping?.canonicalStatusId ?? ""}
                  onChange={(e) => {
                    if (!e.target.value) return;
                    upsert.mutate({
                      brokerId: id,
                      rawStatus: r.rawStatus,
                      canonicalStatusId: e.target.value,
                    });
                  }}
                  style={{
                    background: "var(--bg-0)",
                    color: "var(--fg-0)",
                    border: "1px solid var(--bd-1)",
                    borderRadius: 4,
                    padding: "4px 6px",
                    fontFamily: "var(--mono)",
                    fontSize: 12,
                  }}
                >
                  <option value="">— unmapped —</option>
                  {canonicals.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                {r.mapping?.canonicalStatus ? (
                  <Pill tone={CAT_TONE[r.mapping.canonicalStatus.category as Category]} size="xs">
                    {r.mapping.canonicalStatus.category.toLowerCase()}
                  </Pill>
                ) : (
                  <Pill size="xs">—</Pill>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 20, color: "var(--fg-2)", textAlign: "center" }}>
                no raw statuses observed in last 30 days
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
