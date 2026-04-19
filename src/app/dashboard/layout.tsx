import { auth, signOut } from "@/auth";
import { AppProviders } from "@/components/app-providers";
import Link from "next/link";
import { redirect } from "next/navigation";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/affiliates", label: "Affiliates" },
  { href: "/dashboard/brokers", label: "Brokers" },
  { href: "/dashboard/routing", label: "Routing" },
  { href: "/dashboard/settings/blacklist", label: "Blacklist" },
  { href: "/dashboard/settings/users", label: "Users" },
  { href: "/dashboard/settings/audit", label: "Audit" },
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <AppProviders>
      <div className="flex min-h-screen">
        <aside className="w-56 border-r p-4 space-y-1">
          <div className="font-semibold mb-4">GambChamp CRM</div>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href as never}
              className="block px-2 py-1 rounded hover:bg-gray-100"
            >
              {n.label}
            </Link>
          ))}
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
            className="mt-6"
          >
            <button type="submit" className="text-sm text-gray-600 hover:underline">
              Sign out
            </button>
          </form>
          <div className="mt-4 text-xs text-gray-500">
            {session.user.email} ({session.user.role})
          </div>
        </aside>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </AppProviders>
  );
}
