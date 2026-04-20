"use client";
import { Pill, TabStrip, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

type Kind = "IP_CIDR" | "IP_EXACT" | "EMAIL_DOMAIN" | "PHONE_E164";

const PLACEHOLDERS: Record<Kind, string> = {
  IP_CIDR: "10.0.0.0/8",
  IP_EXACT: "1.2.3.4",
  EMAIL_DOMAIN: "mailinator.com",
  PHONE_E164: "+380671234567",
};

const TABS: { key: Kind; label: string }[] = [
  { key: "IP_CIDR", label: "ip cidr" },
  { key: "IP_EXACT", label: "ip exact" },
  { key: "EMAIL_DOMAIN", label: "email domain" },
  { key: "PHONE_E164", label: "phone" },
];

export default function BlacklistPage() {
  const { theme } = useThemeCtx();
  const [kind, setKind] = useState<Kind>("IP_CIDR");
  const utils = trpc.useUtils();
  const { data } = trpc.blacklist.list.useQuery({ kind });
  const add = trpc.blacklist.add.useMutation({
    onSuccess: () => utils.blacklist.list.invalidate(),
  });
  const remove = trpc.blacklist.remove.useMutation({
    onSuccess: () => utils.blacklist.list.invalidate(),
  });
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");

  return (
    <div style={{ padding: "20px 28px", maxWidth: 860 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        Blacklist
      </h1>
      <TabStrip<Kind>
        tabs={TABS}
        active={kind}
        onChange={(k) => {
          setKind(k);
          setValue("");
          setReason("");
        }}
      />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value) return;
          add.mutate({ kind, value, reason: reason || undefined });
          setValue("");
          setReason("");
        }}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={PLACEHOLDERS[kind]}
          style={{ ...inputStyle(theme), flex: 1 }}
        />
        <input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="reason (optional)"
          style={{ ...inputStyle(theme), flex: 1 }}
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
            <th style={{ padding: "8px 0" }}>value</th>
            <th>reason</th>
            <th>added</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.map((r) => (
            <tr key={r.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
              <td style={{ padding: "8px 0", fontFamily: "var(--mono)" }}>{r.value}</td>
              <td style={{ color: "var(--fg-2)" }}>{r.reason ?? ""}</td>
              <td style={{ fontFamily: "var(--mono)", color: "var(--fg-2)", fontSize: 11 }}>
                {new Date(r.createdAt).toLocaleString()}
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => remove.mutate({ id: r.id })}
                  style={{ ...btnStyle(theme), color: "oklch(72% 0.15 25)" }}
                >
                  remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
