import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkVoip } from "./voip";

describe("checkVoip", () => {
  beforeEach(() => {
    // biome-ignore lint/performance/noDelete: must actually unset env var; assigning undefined coerces to string "undefined"
    delete process.env.NUMVERIFY_API_KEY;
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    // biome-ignore lint/performance/noDelete: must actually unset env var; assigning undefined coerces to string "undefined"
    delete process.env.ANTIFRAUD_VOIP_TIMEOUT_MS;
  });

  it("returns 'mobile' in mock mode", async () => {
    const r = await checkVoip("+380671234567");
    expect(r.lineType).toBe("mobile");
    expect(r.mocked).toBe(true);
  });

  it("returns 'voip' when numverify says voip", async () => {
    process.env.NUMVERIFY_API_KEY = "k";
    global.fetch = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ line_type: "voip" }), { status: 200 }));
    const r = await checkVoip("+380671234567");
    expect(r.lineType).toBe("voip");
    expect(r.mocked).toBe(false);
  });

  it("returns null on timeout", async () => {
    process.env.NUMVERIFY_API_KEY = "k";
    process.env.ANTIFRAUD_VOIP_TIMEOUT_MS = "50";
    global.fetch = vi
      .fn()
      .mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(new Response("{}")), 500)),
      );
    const r = await checkVoip("+380671234567");
    expect(r.lineType).toBeNull();
    expect(r.error).toBeTruthy();
  });
});
