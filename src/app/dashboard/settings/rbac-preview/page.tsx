"use client";

import { trpc } from "@/lib/trpc";
import { useState } from "react";

const ROLES = ["ADMIN", "OPERATOR", "AFFILIATE_VIEWER", "BROKER_VIEWER"] as const;

export default function RbacPreviewPage() {
  const [role, setRole] = useState<(typeof ROLES)[number]>("AFFILIATE_VIEWER");
  const preview = trpc.rbacPreview.preview.useQuery({ role });

  const bd = "var(--bd-1)";
  const fg = "var(--fg-1)";
  const fgStrong = "var(--fg-0)";
  const bg = "var(--bg-1)";
  const bg2 = "var(--bg-2)";

  return (
    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
      <header>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: fgStrong, margin: 0 }}>RBAC Preview</h1>
        <p style={{ fontSize: 12, color: fg, margin: "4px 0 0" }}>
          Admin only — switch a role to see which fields would be returned by lead / broker /
          affiliate queries.
        </p>
      </header>

      <select
        value={role}
        onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])}
        style={{
          background: bg,
          color: fgStrong,
          border: `1px solid ${bd}`,
          borderRadius: 4,
          padding: "4px 8px",
          fontSize: 13,
          width: 220,
        }}
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </select>

      {preview.isError && (
        <div style={{ fontSize: 12, color: "var(--accent-red, #f85149)" }}>
          {preview.error?.message ?? "error"}
        </div>
      )}

      <Section title="Lead sample" body={preview.data?.lead ?? null} bd={bd} bg2={bg2} fg={fg} />
      <Section
        title="Broker sample"
        body={preview.data?.broker ?? null}
        bd={bd}
        bg2={bg2}
        fg={fg}
      />
      <Section
        title="Affiliate sample"
        body={preview.data?.affiliate ?? null}
        bd={bd}
        bg2={bg2}
        fg={fg}
      />
    </div>
  );
}

function Section({
  title,
  body,
  bd,
  bg2,
  fg,
}: {
  title: string;
  body: unknown;
  bd: string;
  bg2: string;
  fg: string;
}) {
  return (
    <section>
      <h2 style={{ fontSize: 13, fontWeight: 600, color: "var(--fg-0)", margin: "0 0 6px" }}>
        {title}
      </h2>
      <pre
        style={{
          background: bg2,
          border: `1px solid ${bd}`,
          borderRadius: 4,
          padding: 12,
          fontSize: 11,
          fontFamily: "var(--mono)",
          color: fg,
          overflow: "auto",
          maxHeight: 300,
        }}
      >
        {JSON.stringify(body, null, 2)}
      </pre>
    </section>
  );
}
