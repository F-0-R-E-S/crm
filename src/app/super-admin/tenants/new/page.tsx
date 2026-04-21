"use client";
import { btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewTenantPage() {
  const { theme } = useThemeCtx();
  const router = useRouter();
  const utils = trpc.useUtils();
  const create = trpc.tenant.create.useMutation({
    onSuccess: () => {
      utils.tenant.list.invalidate();
      router.push("/super-admin/tenants" as never);
    },
  });

  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [domainsRaw, setDomainsRaw] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [featureFlagsRaw, setFeatureFlagsRaw] = useState("{}");

  return (
    <div style={{ padding: "20px 28px", maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        New tenant
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          let featureFlags: Record<string, boolean> = {};
          try {
            featureFlags = JSON.parse(featureFlagsRaw);
          } catch {
            alert("feature-flags JSON is invalid");
            return;
          }
          const domains = domainsRaw
            .split(",")
            .map((s) => s.trim().toLowerCase())
            .filter(Boolean);
          const theme: Record<string, string> = {};
          if (primaryColor) theme.primaryColor = primaryColor;
          if (accentColor) theme.accentColor = accentColor;
          if (logoUrl) theme.logoUrl = logoUrl;
          create.mutate({
            slug,
            name,
            displayName,
            domains,
            theme,
            featureFlags,
          });
        }}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <Labeled label="slug (kebab-case)">
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            style={inputStyle(theme)}
            placeholder="acme"
            required
          />
        </Labeled>
        <Labeled label="name (internal)">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle(theme)}
            placeholder="Acme Corp"
            required
          />
        </Labeled>
        <Labeled label="display name (shown to users)">
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle(theme)}
            placeholder="Acme CRM"
            required
          />
        </Labeled>
        <Labeled label="domains (comma-separated, optional)">
          <input
            value={domainsRaw}
            onChange={(e) => setDomainsRaw(e.target.value)}
            style={inputStyle(theme)}
            placeholder="network.acme.com, api.acme.com"
          />
        </Labeled>
        <Labeled label="brand primary color (oklch/hex)">
          <input
            value={primaryColor}
            onChange={(e) => setPrimaryColor(e.target.value)}
            style={inputStyle(theme)}
            placeholder="oklch(0.6 0.2 200)"
          />
        </Labeled>
        <Labeled label="accent color">
          <input
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            style={inputStyle(theme)}
            placeholder="#ff6600"
          />
        </Labeled>
        <Labeled label="logo URL">
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            style={inputStyle(theme)}
            placeholder="https://cdn.acme.com/logo.svg"
          />
        </Labeled>
        <Labeled label="feature flags JSON">
          <textarea
            value={featureFlagsRaw}
            onChange={(e) => setFeatureFlagsRaw(e.target.value)}
            style={{ ...inputStyle(theme), minHeight: 80, fontFamily: "var(--mono)" }}
          />
        </Labeled>
        {create.error && (
          <div style={{ color: "var(--red)", fontSize: 12 }}>{create.error.message}</div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" style={btnStyle(theme, "primary")} disabled={create.isPending}>
            {create.isPending ? "creating…" : "create tenant"}
          </button>
        </div>
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
