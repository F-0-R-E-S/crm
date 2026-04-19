import Link from "next/link";
import { signOut } from "@/auth";
import { auth } from "@/auth";

const nav: Array<{ href: string; label: string }> = [];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-56 border-r border-slate-200 bg-white p-4">
        <div className="mb-6 text-lg font-semibold">CRM</div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href as never}
              className="rounded-md px-3 py-2 text-sm hover:bg-slate-100"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="mt-8 border-t pt-4 text-xs text-slate-500">
          <div className="mb-2">{session?.user?.email}</div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="text-slate-700 hover:underline">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
