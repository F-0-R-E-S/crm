import { describe, expect, it } from "vitest";
import { applyBrokerAuth } from "./auth";

describe("applyBrokerAuth", () => {
  it("BEARER attaches Authorization header", () => {
    const r = applyBrokerAuth("https://x", { "content-type": "application/json" }, "BEARER", {
      token: "abc",
    });
    expect(r.headers.Authorization).toBe("Bearer abc");
    expect(r.url).toBe("https://x");
  });

  it("BASIC base64-encodes", () => {
    const r = applyBrokerAuth("https://x", {}, "BASIC", { user: "u", password: "p" });
    expect(r.headers.Authorization).toBe("Basic " + Buffer.from("u:p").toString("base64"));
  });

  it("API_KEY_HEADER sets custom header", () => {
    const r = applyBrokerAuth("https://x", {}, "API_KEY_HEADER", {
      headerName: "X-Api-Key",
      token: "k",
    });
    expect(r.headers["X-Api-Key"]).toBe("k");
  });

  it("API_KEY_QUERY appends query param", () => {
    const r = applyBrokerAuth("https://x/p", {}, "API_KEY_QUERY", {
      paramName: "api_key",
      token: "k",
    });
    expect(r.url).toBe("https://x/p?api_key=k");
  });

  it("API_KEY_QUERY preserves existing query string", () => {
    const r = applyBrokerAuth("https://x/p?foo=1", {}, "API_KEY_QUERY", {
      paramName: "api_key",
      token: "k",
    });
    expect(r.url).toBe("https://x/p?foo=1&api_key=k");
  });

  it("NONE passes through", () => {
    const r = applyBrokerAuth("https://x", {}, "NONE", {});
    expect(r.url).toBe("https://x");
    expect(Object.keys(r.headers)).toHaveLength(0);
  });
});
