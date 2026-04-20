"use client";
import { Pill, btnStyle, inputStyle } from "@/components/router-crm";
import { useThemeCtx } from "@/components/shell/ThemeProvider";
import { trpc } from "@/lib/trpc";
import { useState } from "react";

type Role = "ADMIN" | "OPERATOR";

export default function UsersPage() {
  const { theme } = useThemeCtx();
  const utils = trpc.useUtils();
  const { data } = trpc.user.list.useQuery();
  const create = trpc.user.create.useMutation({ onSuccess: () => utils.user.list.invalidate() });
  const setRole = trpc.user.setRole.useMutation({ onSuccess: () => utils.user.list.invalidate() });
  const resetPw = trpc.user.resetPassword.useMutation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRoleInput] = useState<Role>("OPERATOR");

  return (
    <div style={{ padding: "20px 28px", maxWidth: 860 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, letterSpacing: "-0.02em", margin: "0 0 16px" }}>
        Users
      </h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!email || password.length < 8) return;
          create.mutate({ email, password, role });
          setEmail("");
          setPassword("");
        }}
        style={{ display: "flex", gap: 8, marginBottom: 16 }}
      >
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          style={{ ...inputStyle(theme), width: 220 }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 8)"
          style={{ ...inputStyle(theme), width: 180 }}
        />
        <select
          value={role}
          onChange={(e) => setRoleInput(e.target.value as Role)}
          style={{ ...inputStyle(theme), width: 140 }}
        >
          <option value="OPERATOR">OPERATOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <button type="submit" style={btnStyle(theme, "primary")}>
          Create
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
            <th style={{ padding: "8px 0" }}>email</th>
            <th>role</th>
            <th>created</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data?.map((u) => (
            <tr key={u.id} style={{ borderTop: "1px solid var(--bd-1)" }}>
              <td style={{ padding: "8px 0" }}>{u.email}</td>
              <td>
                {u.role === "ADMIN" ? (
                  <Pill tone="accent" size="xs">
                    ADMIN
                  </Pill>
                ) : (
                  <Pill size="xs">OPERATOR</Pill>
                )}
                <select
                  defaultValue={u.role}
                  onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value as Role })}
                  style={{ ...inputStyle(theme), width: 120, marginLeft: 10 }}
                >
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="ADMIN">ADMIN</option>
                </select>
              </td>
              <td style={{ fontFamily: "var(--mono)", color: "var(--fg-2)", fontSize: 11 }}>
                {new Date(u.createdAt).toLocaleString()}
              </td>
              <td>
                <button
                  type="button"
                  onClick={() => {
                    const pw = prompt("New password (min 8)");
                    if (pw && pw.length >= 8) resetPw.mutate({ id: u.id, password: pw });
                  }}
                  style={btnStyle(theme)}
                >
                  reset pw
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
