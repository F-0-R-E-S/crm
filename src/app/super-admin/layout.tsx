/**
 * v2.0 S2.0-2 — super-admin shell.
 *
 * Gate: `session.user.role === "SUPER_ADMIN"`. Anything else → /dashboard.
 * Super-admins share the regular dashboard chrome but get their own top-level
 * route tree (never scoped inside the /dashboard tenant-bound tree).
 */
import { auth, signOut } from "@/auth";
import { AppProviders } from "@/components/app-providers";
import { Topbar } from "@/components/shell/Topbar";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "SUPER_ADMIN") redirect("/dashboard");
  return (
    <AppProviders>
      <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
        <aside
          style={{
            width: 220,
            flexShrink: 0,
            borderRight: "1px solid var(--bd-1)",
            background: "var(--bg-1)",
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--fg-1)",
              marginBottom: 6,
            }}
          >
            super-admin
          </div>
          <Link
            href={"/super-admin/tenants" as never}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              textDecoration: "none",
              color: "var(--fg-0)",
              background: "var(--bg-2)",
              fontSize: 13,
            }}
          >
            tenants
          </Link>
          <Link
            href={"/dashboard" as never}
            style={{
              padding: "8px 10px",
              borderRadius: 6,
              textDecoration: "none",
              color: "var(--fg-1)",
              fontSize: 13,
            }}
          >
            ← back to dashboard
          </Link>
          <div style={{ flex: 1 }} />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button
              type="submit"
              style={{
                width: "100%",
                padding: "6px 10px",
                borderRadius: 6,
                background: "transparent",
                border: "1px solid var(--bd-1)",
                color: "var(--fg-1)",
                cursor: "pointer",
                fontSize: 12,
              }}
            >
              sign out
            </button>
          </form>
        </aside>
        <main style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Topbar />
          <div style={{ flex: 1, overflow: "auto" }}>{children}</div>
        </main>
      </div>
    </AppProviders>
  );
}
