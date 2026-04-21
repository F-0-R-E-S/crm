"use client";
import { useEffect, useState } from "react";

interface ShareLink {
  token: string;
  query: unknown;
  createdAt: string;
  expiresAt: string;
  expired: boolean;
}

const ctlStyle: React.CSSProperties = {
  border: "1px solid var(--bd-1)",
  borderRadius: 4,
  padding: "4px 8px",
  fontSize: 12,
  background: "var(--bg-2)",
  color: "inherit",
};

export function ShareDialog({
  onClose,
  onCreateShare,
}: {
  onClose: () => void;
  onCreateShare: (ttlDays: number) => Promise<string | null>;
}) {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [ttlDays, setTtlDays] = useState(30);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/analytics/share");
      if (res.ok) {
        const data = (await res.json()) as { links: ShareLink[] };
        setLinks(data.links);
      }
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: one-shot mount fetch; refresh is stable via closure
  useEffect(() => {
    refresh();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const copyLink = async (token: string) => {
    const url = `${window.location.origin}/share/analytics/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      showToast(`Copied: ${url.length > 48 ? `${url.slice(0, 48)}…` : url}`);
    } catch {
      showToast(url);
    }
  };

  const create = async () => {
    const token = await onCreateShare(ttlDays);
    if (token) {
      showToast("Share link created");
      await refresh();
      // auto-copy the fresh token
      copyLink(token);
    }
  };

  const purgeExpired = async () => {
    try {
      const res = await fetch("/api/v1/analytics/share", { method: "DELETE" });
      if (res.ok) {
        const { deleted } = (await res.json()) as { deleted: number };
        showToast(`Purged ${deleted} expired link${deleted === 1 ? "" : "s"}`);
        refresh();
      }
    } catch {
      showToast("Purge failed");
    }
  };

  const expiredCount = links.filter((l) => l.expired).length;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: 80,
        zIndex: 50,
      }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        style={{
          width: 580,
          maxHeight: "70vh",
          overflow: "auto",
          background: "var(--bg-0, white)",
          border: "1px solid var(--bd-1)",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Share links</h3>
          <button type="button" onClick={onClose} style={ctlStyle}>
            close
          </button>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontSize: 11, color: "var(--fg-2)" }}>
            TTL (days)
            <select
              value={ttlDays}
              onChange={(e) => setTtlDays(Number(e.target.value))}
              style={{ ...ctlStyle, marginLeft: 6 }}
            >
              <option value={1}>1</option>
              <option value={7}>7</option>
              <option value={30}>30</option>
              <option value={90}>90</option>
            </select>
          </label>
          <button
            type="button"
            style={{
              ...ctlStyle,
              background: "var(--accent, oklch(76% 0.12 220))",
              color: "var(--bg-0, #000)",
            }}
            onClick={create}
          >
            + create link
          </button>
          {expiredCount > 0 ? (
            <button
              type="button"
              style={{ ...ctlStyle, color: "#c00" }}
              onClick={purgeExpired}
              title="Delete all expired links"
            >
              purge expired ({expiredCount})
            </button>
          ) : null}
        </div>
        {loading ? (
          <div style={{ fontSize: 12, color: "var(--fg-2)" }}>Loading…</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {links.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--fg-2)", padding: 12 }}>
                No share links yet.
              </div>
            ) : null}
            {links.map((l) => {
              const expiresIn = Math.max(
                0,
                Math.ceil((new Date(l.expiresAt).getTime() - Date.now()) / 86_400_000),
              );
              return (
                <div
                  key={l.token}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 12,
                    padding: 6,
                    borderBottom: "1px solid var(--bd-1)",
                  }}
                >
                  <code style={{ fontSize: 11, color: "var(--fg-2)" }}>
                    {l.token.slice(0, 10)}…
                  </code>
                  <span
                    style={{
                      flex: 1,
                      fontSize: 11,
                      color: l.expired ? "#c00" : expiresIn <= 3 ? "#c80" : "var(--fg-2)",
                    }}
                  >
                    {l.expired ? "expired" : `expires in ${expiresIn}d`}
                  </span>
                  <button type="button" style={ctlStyle} onClick={() => copyLink(l.token)}>
                    copy
                  </button>
                </div>
              );
            })}
          </div>
        )}
        {toast ? (
          <div
            style={{
              fontSize: 12,
              background: "var(--accent, oklch(76% 0.12 220))",
              color: "var(--bg-0, #000)",
              padding: "6px 10px",
              borderRadius: 4,
              alignSelf: "flex-start",
            }}
          >
            {toast}
          </div>
        ) : null}
      </div>
    </div>
  );
}
