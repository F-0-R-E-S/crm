"use client";
import { useActionState } from "react";
import { signupAction } from "./actions";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signupAction, {});

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
        action={action}
        style={{
          width: 400,
          padding: 28,
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
            G
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Start your 14-day trial</div>
            <div
              style={{
                fontSize: 10,
                fontFamily: "var(--mono)",
                color: "var(--fg-2)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              gambchamp · crm
            </div>
          </div>
        </div>

        <label style={{ fontSize: 11, color: "var(--fg-2)" }}>Work email</label>
        <input
          type="email"
          name="email"
          required
          placeholder="founder@acme.io"
          style={inputStyle}
        />

        <label style={{ fontSize: 11, color: "var(--fg-2)" }}>Password (min 8)</label>
        <input
          type="password"
          name="password"
          required
          minLength={8}
          placeholder="••••••••"
          style={inputStyle}
        />

        <label style={{ fontSize: 11, color: "var(--fg-2)" }}>Organization name</label>
        <input
          type="text"
          name="orgName"
          required
          minLength={2}
          maxLength={60}
          placeholder="Acme Corp"
          style={inputStyle}
        />

        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "10px",
            background: "var(--fg-0)",
            color: "var(--bg-1)",
            border: "none",
            borderRadius: 4,
            fontSize: 13,
            fontWeight: 500,
            cursor: pending ? "not-allowed" : "pointer",
            opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Creating…" : "Create account"}
        </button>

        {state.error && (
          <div style={{ fontSize: 12, color: "oklch(72% 0.15 25)" }}>{state.error}</div>
        )}

        <div style={{ fontSize: 11, color: "var(--fg-2)", marginTop: 4 }}>
          Already have an account?{" "}
          <a href="/login" style={{ color: "var(--fg-0)" }}>
            Log in
          </a>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-4)",
  color: "var(--fg-0)",
  border: "1px solid var(--bd-2)",
  borderRadius: 4,
  padding: "8px 10px",
  fontSize: 13,
  outline: "none",
};
