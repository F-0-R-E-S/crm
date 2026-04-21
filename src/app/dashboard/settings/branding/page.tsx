"use client";
import { btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useEffect, useState } from "react";

export default function BrandingSettingsPage() {
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data } = trpc.tenant.myBranding.useQuery();
  const update = trpc.tenant.updateMyBranding.useMutation({
    onSuccess: () => utils.tenant.myBranding.invalidate(),
  });

  const [displayName, setDisplayName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  const [accentColor, setAccentColor] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [terms, setTerms] = useState("");

  useEffect(() => {
    if (!data) return;
    setDisplayName(data.displayName);
    const t = (data.theme ?? {}) as Record<string, unknown>;
    setBrandName((t.brandName as string) ?? "");
    setLogoUrl((t.logoUrl as string) ?? "");
    setPrimaryColor((t.primaryColor as string) ?? "");
    setAccentColor((t.accentColor as string) ?? "");
    const ll = (t.legalLinks ?? {}) as Record<string, string>;
    setPrivacy(ll.privacy ?? "");
    setTerms(ll.terms ?? "");
  }, [data]);

  if (!data) return <div style={{ padding: 20 }}>loading…</div>;

  return (
    <div style={{ padding: "20px 28px", maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 8px" }}>
        Branding
      </h1>
      <p style={{ fontSize: 13, color: "var(--fg-1)", margin: "0 0 18px" }}>
        Customize how the CRM looks to your team. Changes take effect on next page load.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const themeObj: Record<string, unknown> = {};
          if (brandName) themeObj.brandName = brandName;
          if (logoUrl) themeObj.logoUrl = logoUrl;
          if (primaryColor) themeObj.primaryColor = primaryColor;
          if (accentColor) themeObj.accentColor = accentColor;
          const legalLinks: Record<string, string> = {};
          if (privacy) legalLinks.privacy = privacy;
          if (terms) legalLinks.terms = terms;
          if (Object.keys(legalLinks).length) themeObj.legalLinks = legalLinks;
          update.mutate({
            displayName,
            theme: themeObj as never,
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
        <Labeled label="brand name (topbar logo text)">
          <input
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            style={inputStyle(theme)}
            placeholder="Acme CRM"
          />
        </Labeled>
        <Labeled label="logo URL (png/svg, https)">
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            style={inputStyle(theme)}
            placeholder="https://cdn.acme.com/logo.svg"
          />
        </Labeled>
        <Labeled label="primary color (oklch/hex)">
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
        <Labeled label="privacy policy URL">
          <input
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value)}
            style={inputStyle(theme)}
          />
        </Labeled>
        <Labeled label="terms URL">
          <input
            value={terms}
            onChange={(e) => setTerms(e.target.value)}
            style={inputStyle(theme)}
          />
        </Labeled>
        {update.error && (
          <div style={{ color: "var(--red)", fontSize: 12 }}>{update.error.message}</div>
        )}
        <div style={{ display: "flex", gap: 8 }}>
          <button type="submit" style={btnStyle(theme, "primary")} disabled={update.isPending}>
            {update.isPending ? "saving…" : "save branding"}
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
