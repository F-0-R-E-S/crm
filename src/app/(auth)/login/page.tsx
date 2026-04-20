"use client";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function Login() {
  const [email, setEmail] = useState(
    process.env.NODE_ENV === "production" ? "" : "admin@gambchamp.local",
  );
  const [password, setPassword] = useState(
    process.env.NODE_ENV === "production" ? "" : "changeme",
  );
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const r = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/dashboard",
    });
    if (r?.ok) window.location.assign(r.url ?? "/dashboard");
    else setErr("invalid credentials");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--bg-0)",
        color: "var(--fg-0)",
        fontFamily: "var(--sans)",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width: 340,
          padding: 24,
          border: "1px solid var(--bd-1)",
          borderRadius: 8,
          background: "var(--bg-1)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "var(--fg-0)",
              color: "var(--bg-1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontFamily: "var(--mono)",
            }}
          >
            R
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>ROUTER</div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--mono)",
                color: "var(--fg-2)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              crm · v0.1
            </div>
          </div>
        </div>
        <input
          autoFocus
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          style={{
            background: "var(--bg-4)",
            color: "var(--fg-0)",
            border: "1px solid var(--bd-2)",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 13,
            outline: "none",
          }}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password"
          style={{
            background: "var(--bg-4)",
            color: "var(--fg-0)",
            border: "1px solid var(--bd-2)",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 13,
            outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px",
            background: "var(--fg-0)",
            color: "var(--bg-1)",
            border: "none",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Sign in
        </button>
        {err && <div style={{ fontSize: 12, color: "oklch(72% 0.15 25)" }}>{err}</div>}
      </form>
    </div>
  );
}
