import type { BrokerAuthType } from "@prisma/client";

export function applyBrokerAuth(
  url: string,
  headers: Record<string, string>,
  authType: BrokerAuthType,
  authConfig: Record<string, unknown>,
): { url: string; headers: Record<string, string> } {
  const h = { ...headers };
  switch (authType) {
    case "BEARER":
      h.Authorization = `Bearer ${authConfig.token as string}`;
      return { url, headers: h };
    case "BASIC": {
      const creds = Buffer.from(`${authConfig.user}:${authConfig.password}`).toString("base64");
      h.Authorization = `Basic ${creds}`;
      return { url, headers: h };
    }
    case "API_KEY_HEADER":
      h[authConfig.headerName as string] = authConfig.token as string;
      return { url, headers: h };
    case "API_KEY_QUERY": {
      const sep = url.includes("?") ? "&" : "?";
      return {
        url: `${url}${sep}${authConfig.paramName as string}=${encodeURIComponent(authConfig.token as string)}`,
        headers: h,
      };
    }
    default:
      return { url, headers: h };
  }
}
