import { auth, signOut } from "@/auth";
import { AppProviders } from "@/components/app-providers";
import { KeyboardNav } from "@/components/shell/KeyboardNav";
import { Sidebar } from "@/components/shell/Sidebar";
import { ThemeProvider } from "@/components/shell/ThemeProvider";
import { Topbar } from "@/components/shell/Topbar";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return (
    <ThemeProvider>
      <AppProviders>
        <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
          <Sidebar userEmail={session.user.email} userRole={session.user.role} />
          <main
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minWidth: 0,
              position: "relative",
            }}
          >
            <Topbar />
            <div style={{ flex: 1, overflow: "auto", position: "relative" }}>{children}</div>
          </main>
          <KeyboardNav />
          <SignOutForm />
        </div>
      </AppProviders>
    </ThemeProvider>
  );
}

function SignOutForm() {
  return (
    <form
      action={async () => {
        "use server";
        await signOut({ redirectTo: "/login" });
      }}
      style={{ display: "none" }}
      id="signout-form"
    />
  );
}
