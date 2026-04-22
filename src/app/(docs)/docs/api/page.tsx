import { Breadcrumbs } from "@/components/docs/Breadcrumbs";
import ApiDocsClient from "./ApiDocsClient";

export const metadata = {
  title: "API Reference — GambChamp CRM",
  description: "Live OpenAPI 3.0 reference for the public /api/v1 surface.",
};

export default function DocsApiPage() {
  return (
    <article className="min-w-0 flex-1">
      <Breadcrumbs trail={[{ label: "Docs", href: "/docs" }, { label: "API Reference" }]} />
      <h1 className="text-3xl font-semibold">API Reference</h1>
      <p className="my-3 text-muted-foreground">
        Public REST surface. Authenticate with a Bearer API key; pin the schema version via{" "}
        <code>X-API-Version</code>.
      </p>
      <div className="mt-6 rounded-lg border">
        <ApiDocsClient />
      </div>
    </article>
  );
}
