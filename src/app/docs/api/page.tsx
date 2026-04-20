import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Docs — GambChamp CRM",
  description: "Interactive OpenAPI documentation for the GambChamp lead distribution API.",
};

/**
 * Server-rendered Scalar API Reference viewer.
 * Loads the Scalar standalone bundle from jsDelivr (pinned); reads the spec from /api/v1/openapi.
 */
export default function ApiDocsPage() {
  const scalarSrc = "https://cdn.jsdelivr.net/npm/@scalar/api-reference@1/dist/browser/standalone.min.js";
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
      <script
        id="api-reference"
        type="application/json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({ url: "/api/v1/openapi", theme: "default", layout: "modern" }),
        }}
      />
      <script src={scalarSrc} async />
    </div>
  );
}
