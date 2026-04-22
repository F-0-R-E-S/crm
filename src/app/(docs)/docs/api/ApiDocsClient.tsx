"use client";
import { ApiReferenceReact } from "@scalar/api-reference-react";

/**
 * Client wrapper around Scalar's React component. Kept in a separate file so the
 * parent route can stay a server component and supply metadata.
 */
export default function ApiDocsClient({ specUrl = "/api/v1/openapi" }: { specUrl?: string }) {
  return (
    <ApiReferenceReact
      configuration={{
        url: specUrl,
        theme: "default",
        layout: "modern",
      }}
    />
  );
}
