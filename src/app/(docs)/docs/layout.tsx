import { ChatWidget } from "@/components/docs/ChatWidget";
import { Sidebar } from "@/components/docs/Sidebar";
import { loadDocsTree } from "@/lib/docs-content";

export const dynamic = "force-static";
export const revalidate = false;

export default async function DocsLayout({ children }: { children: React.ReactNode }) {
  const tree = await loadDocsTree({ root: "content/docs" });
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-8 px-4 py-8">
      <aside className="w-64 shrink-0 border-r pr-6">
        <Sidebar tree={tree} />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
      <ChatWidget />
    </div>
  );
}
