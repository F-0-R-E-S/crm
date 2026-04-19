import { describe, expect, it } from "vitest";
import { renderPostbackUrl } from "./render-postback-url";

describe("renderPostbackUrl", () => {
  it("substitutes {sub_id} {status} {payout}", () => {
    const url = "http://t?click_id={sub_id}&s={status}&p={payout}";
    const out = renderPostbackUrl(url, { sub_id: "abc", status: "ftd", payout: "50", lead_id: "l", event_ts: "t", trace_id: "x", broker_id: "b" });
    expect(out).toBe("http://t?click_id=abc&s=ftd&p=50");
  });

  it("URL-encodes special chars", () => {
    const out = renderPostbackUrl("http://t?x={status}", { sub_id: "", status: "a b & c", payout: "0", lead_id: "", event_ts: "", trace_id: "", broker_id: "" });
    expect(out).toBe("http://t?x=a%20b%20%26%20c");
  });

  it("leaves unknown macros as literal", () => {
    const out = renderPostbackUrl("http://t?x={unknown}", { sub_id: "", status: "", payout: "", lead_id: "", event_ts: "", trace_id: "", broker_id: "" });
    expect(out).toBe("http://t?x={unknown}");
  });

  it("empty sub_id renders as empty string", () => {
    const out = renderPostbackUrl("http://t?c={sub_id}", { sub_id: "", status: "", payout: "", lead_id: "", event_ts: "", trace_id: "", broker_id: "" });
    expect(out).toBe("http://t?c=");
  });
});
