"use client";
import { trpc } from "@/lib/trpc";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AffiliatePayoutRuleForm } from "./_components/affiliate-payout-rule-form";

export default function AffiliatePayoutPage() {
  const params = useParams<{ id: string }>();
  const affiliateId = params?.id;
  const utils = trpc.useUtils();
  const rules = trpc.finance.listAffiliatePayoutRules.useQuery(
    { affiliateId: affiliateId ?? "" },
    { enabled: !!affiliateId },
  );

  if (!affiliateId) return null;

  return (
    <div
      style={{
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontSize: 13,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
        <h1 style={{ fontSize: 15, fontWeight: 600 }}>Payout rules</h1>
        <Link
          href={`/dashboard/affiliates/${affiliateId}`}
          style={{
            fontSize: 11,
            fontFamily: "var(--mono)",
            color: "var(--fg-1)",
            textDecoration: "none",
          }}
        >
          ← back to affiliate
        </Link>
      </div>
      <section>
        <h2
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            opacity: 0.6,
            marginBottom: 8,
          }}
        >
          Active & historical
        </h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                textAlign: "left",
                fontSize: 10,
                textTransform: "uppercase",
                opacity: 0.6,
                borderBottom: "1px solid var(--bd-1)",
              }}
            >
              <th style={{ padding: "6px 0" }}>Scope</th>
              <th>Kind</th>
              <th>CPA</th>
              <th>CRG</th>
              <th>Rev share</th>
              <th>From</th>
              <th>To</th>
            </tr>
          </thead>
          <tbody>
            {rules.data?.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--bd-1)" }}>
                <td style={{ padding: "6px 0", fontFamily: "var(--mono)" }}>
                  {r.brokerId ? r.brokerId.slice(0, 8) : "global"}
                </td>
                <td style={{ fontFamily: "var(--mono)" }}>{r.kind}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{r.cpaAmount?.toString() ?? "—"}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{r.crgRate?.toString() ?? "—"}</td>
                <td style={{ fontFamily: "var(--mono)" }}>{r.revShareRate?.toString() ?? "—"}</td>
                <td style={{ fontFamily: "var(--mono)" }}>
                  {new Date(r.activeFrom).toISOString().slice(0, 10)}
                </td>
                <td style={{ fontFamily: "var(--mono)" }}>
                  {r.activeTo ? new Date(r.activeTo).toISOString().slice(0, 10) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rules.data && rules.data.length === 0 ? (
          <div style={{ padding: 12, opacity: 0.6 }}>No rules yet.</div>
        ) : null}
      </section>
      <section style={{ maxWidth: 480 }}>
        <h2
          style={{
            fontSize: 10,
            textTransform: "uppercase",
            opacity: 0.6,
            marginBottom: 8,
          }}
        >
          Add / update rule
        </h2>
        <AffiliatePayoutRuleForm
          affiliateId={affiliateId}
          onSaved={() => utils.finance.listAffiliatePayoutRules.invalidate({ affiliateId })}
        />
      </section>
    </div>
  );
}
