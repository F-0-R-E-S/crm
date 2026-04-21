import type { Metadata } from "next";
import ApiDocsClient from "./ApiDocsClient";

export const metadata: Metadata = {
  title: "API Docs — GambChamp CRM",
  description: "Interactive OpenAPI documentation for the GambChamp lead distribution API.",
};

/**
 * Self-hosted Scalar API Reference viewer (v1.0.1).
 * Uses the locally bundled `@scalar/api-reference-react` package — no CDN dependency.
 * Spec source remains `/api/v1/openapi` (yaml file under `docs/api/v1/openapi.yaml`).
 */
export default function ApiDocsPage() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #eee",
          background: "#fafafa",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <strong>GambChamp CRM API v1</strong>
        {" — "}
        <span style={{ color: "#555" }}>
          Sandbox keys: create an API key in the dashboard and toggle <em>sandbox mode</em> — all
          intake endpoints become deterministic mocks. See the spec description for the outcome
          catalog.
        </span>
      </header>
      <ApiDocsClient specUrl="/api/v1/openapi" />
    </div>
  );
}
