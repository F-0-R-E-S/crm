"use client";
import { Pill, btnStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import Link from "next/link";

export default function SuperAdminTenantsPage() {
  const { theme } = useThemeCtx();
  const { data } = trpc.tenant.list.useQuery();

  return (
    <div style={{ padding: "20px 28px", maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: 16 }}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "-0.02em",
            margin: 0,
            flex: 1,
          }}
        >
          Tenants
        </h1>
        <Link href={"/super-admin/tenants/new" as never} style={btnStyle(theme, "primary")}>
          + new tenant
        </Link>
      </div>
      <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
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
            <th style={{ padding: "8px 0" }}>slug</th>
            <th>display name</th>
            <th>domains</th>
            <th>users</th>
            <th>brokers</th>
            <th>leads</th>
            <th>status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.map((t) => (
            <tr key={t.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
              <td
                style={{
                  padding: "8px 0",
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                }}
              >
                {t.slug}
              </td>
              <td>{t.displayName}</td>
              <td style={{ fontSize: 11, color: "var(--fg-1)" }}>
                {t.domains.length === 0 ? "—" : t.domains.join(", ")}
              </td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{t.userCount}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{t.brokerCount}</td>
              <td style={{ fontFamily: "var(--mono)", fontSize: 11 }}>{t.leadCount}</td>
              <td>
                {t.isActive ? (
                  <Pill tone="accent" size="xs">
                    ACTIVE
                  </Pill>
                ) : (
                  <Pill size="xs">INACTIVE</Pill>
                )}
              </td>
              <td style={{ textAlign: "right" }}>
                <Link
                  href={`/super-admin/tenants/${t.id}` as never}
                  style={{ ...btnStyle(theme), fontSize: 11 }}
                >
                  edit
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {(data?.length ?? 0) === 0 && (
        <div style={{ padding: 40, textAlign: "center", color: "var(--fg-2)" }}>
          No tenants yet — click “new tenant” to create one.
        </div>
      )}
    </div>
  );
}
