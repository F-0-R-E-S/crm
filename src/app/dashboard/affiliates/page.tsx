"use client";
import { Pill, Sparkline, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useState } from "react";

function qualityColor(avg: number | null): string {
  if (avg == null) return "var(--fg-2)";
  if (avg >= 71) return "oklch(72% 0.15 150)";
  if (avg >= 41) return "oklch(72% 0.15 80)";
  return "oklch(72% 0.15 25)";
}

export default function AffiliatesPage() {
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data } = trpc.affiliate.list.useQuery();
  const { data: sparklines } = trpc.affiliate.qualitySparklines.useQuery();
  const create = trpc.affiliate.create.useMutation({
    onSuccess: () => utils.affiliate.list.invalidate(),
  });
  const [name, setName] = useState("");

  const sparkByAff = new Map(
    (sparklines ?? []).map((s) => [
      s.affiliateId,
      { points: s.points.map((p) => p.avgQ), avg7d: s.avg7d },
    ]),
  );

  return (
    <div style={{ padding: "20px 28px" }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        Affiliates
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name) {
            create.mutate({ name });
            setName("");
          }
        }}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New affiliate name"
          style={{ ...inputStyle(theme), width: 240 }}
        />
        <button type="submit" style={btnStyle(theme, "primary")}>
          Add
        </button>
      </form>
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
            <th style={{ padding: "8px 0" }}>name</th>
            <th>cap</th>
            <th>postback</th>
            <th>status</th>
            <th>q trend</th>
          </tr>
        </thead>
        <tbody>
          {data?.map((a) => (
            <tr key={a.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
              <td style={{ padding: "10px 0" }}>
                <Link
                  href={`/dashboard/affiliates/${a.id}` as never}
                  style={{ color: "var(--fg-0)", textDecoration: "none", fontWeight: 500 }}
                >
                  {a.name}
                </Link>
              </td>
              <td style={{ fontFamily: "var(--mono)" }}>{a.totalDailyCap ?? "∞"}</td>
              <td>
                {a.postbackUrl ? (
                  <Pill tone="success" size="xs">
                    configured
                  </Pill>
                ) : (
                  <Pill size="xs">—</Pill>
                )}
              </td>
              <td>
                {a.isActive ? (
                  <Pill tone="success" size="xs">
                    active
                  </Pill>
                ) : (
                  <Pill tone="warn" size="xs">
                    paused
                  </Pill>
                )}
              </td>
              <td>
                {(() => {
                  const sp = sparkByAff.get(a.id);
                  const avg = sp?.avg7d ?? null;
                  const pts = sp?.points ?? [];
                  return (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {pts.length >= 2 ? (
                        <div style={{ color: qualityColor(avg) }}>
                          <Sparkline points={pts} width={60} height={18} />
                        </div>
                      ) : (
                        <span style={{ color: "var(--fg-2)", fontFamily: "var(--mono)" }}>—</span>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "var(--mono)",
                          color: qualityColor(avg),
                          fontWeight: 500,
                        }}
                      >
                        {avg != null ? Math.round(avg) : "—"}
                      </span>
                    </div>
                  );
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
