import { Breadcrumbs } from "@/components/docs/Breadcrumbs";
import { ChatRoom } from "./ChatRoom";

export const metadata = {
  title: "Ask the docs — GambChamp CRM",
  description: "Grounded Q&A over the documentation. Every answer cites its sources.",
};

export default function DocsAiPage() {
  return (
    <article className="min-w-0 flex-1">
      <Breadcrumbs trail={[{ label: "Docs", href: "/docs" }, { label: "Ask the AI" }]} />
      <h1 className="text-3xl font-semibold">Ask the docs</h1>
      <p className="my-2 text-muted-foreground">
        The assistant answers only from what&apos;s documented here and cites sources. If context is
        thin, it refuses.
      </p>
      <ChatRoom />
    </article>
  );
}
