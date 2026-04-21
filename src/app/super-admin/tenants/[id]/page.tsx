"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditTenantPage() {
  const { theme } = useThemeCtx();
  const router = useRouter();
  const utils = trpc.useUtils();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);

  const { data: tenant, isLoading } = trpc.tenant.byId.useQuery({ id });
  const update = trpc.tenant.update.useMutation({
    onSuccess: () => {
      utils.tenant.list.invalidate();
      utils.tenant.byId.invalidate({ id });
    },
  });
  const remove = trpc.tenant.remove.useMutation({
    onSuccess: () => {
      utils.tenant.list.invalidate();
      router.push("/super-admin/tenants" as never);
    },
  });

  const [displayName, setDisplayName] = useState("");
  const [domainsRaw, setDomainsRaw] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [themeRaw, setThemeRaw] = useState("{}");
  const [ffRaw, setFfRaw] = useState("{}");

  useEffect(() => {
    if (!tenant) return;
    setDisplayName(tenant.displayName);
    setDomainsRaw(tenant.domains.join(", "));
    setIsActive(tenant.isActive);
    setThemeRaw(JSON.stringify(tenant.theme ?? {}, null, 2));
    setFfRaw(JSON.stringify(tenant.featureFlags ?? {}, null, 2));
  }, [tenant]);

  if (isLoading) return <div style={{ padding: 20 }}>loading…</div>;
  if (!tenant) return <div style={{ padding: 20 }}>not found.</div>;

  return (
    <div style={{ padding: "20px 28px", maxWidth: 760 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: 0 }}>
          {tenant.slug}
        </h1>
        <span style={{ fontFamily: "var(--mono)", color: "var(--fg-2)", fontSize: 11 }}>
          {tenant.id}
        </span>
        {tenant.isActive ? (
          <Pill tone="accent" size="xs">
            ACTIVE
          </Pill>
        ) : (
          <Pill size="xs">INACTIVE</Pill>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          let themeObj: unknown = {};
          let ffObj: unknown = {};
          try {
            themeObj = JSON.parse(themeRaw);
          } catch {
            alert("theme JSON invalid");
            return;
          }
          try {
            ffObj = JSON.parse(ffRaw);
          } catch {
            alert("feature-flags JSON invalid");
            return;
          }
          const domains = domainsRaw
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          update.mutate({
            id,
            displayName,
            domains,
            theme: themeObj as never,
            featureFlags: ffObj as Record<string, boolean>,
            isActive,
          });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <Labeled label="display name">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle(theme)}
          />
        </Labeled>
        <Labeled label="domains (comma-separated)">
          <input
            value={domainsRaw}
            onChange={(e) => setDomainsRaw(e.target.value)}
            style={inputStyle(theme)}
          />
        </Labeled>
        <Labeled label="active">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
        </Labeled>
        <Labeled label="theme JSON">
          <textarea
            value={themeRaw}
            onChange={(e) => setThemeRaw(e.target.value)}
            style={{ ...inputStyle(theme), minHeight: 160, fontFamily: "var(--mono)" }}
          />
        </Labeled>
        <Labeled label="feature-flags JSON">
          <textarea
            value={ffRaw}
            onChange={(e) => setFfRaw(e.target.value)}
            style={{ ...inputStyle(theme), minHeight: 100, fontFamily: "var(--mono)" }}
          />
        </Labeled>
        {update.error && (
          <div style={{ color: "var(--red)", fontSize: 12 }}>{update.error.message}</div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" style={btnStyle(theme, "primary")} disabled={update.isPending}>
            save
          </button>
          {tenant.id !== "tenant_default" && (
            <button
              type="button"
              onClick={() => {
                if (!confirm(`Delete tenant "${tenant.slug}"? This cannot be undone.`)) return;
                const force = confirm(
                  "Use force=true? Only if tenant is drained of users/brokers/leads.",
                );
                remove.mutate({ id, force });
              }}
              style={btnStyle(theme)}
            >
              delete
            </button>
          )}
        </div>
        {remove.error && (
          <div style={{ color: "var(--red)", fontSize: 12 }}>{remove.error.message}</div>
        )}
      </form>
    </div>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control is dynamic children (input/textarea)
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        style={{
          fontSize: 10,
          fontFamily: "var(--mono)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--fg-2)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
