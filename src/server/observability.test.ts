import { describe, expect, it } from "vitest";
import { getTraceId, logger, runWithTrace } from "./observability";

describe("observability", () => {
  it("returns undefined outside of a trace context", () => {
    expect(getTraceId()).toBeUndefined();
  });

  it("propagates trace_id inside runWithTrace", async () => {
    const captured = await runWithTrace("abc123", async () => getTraceId());
    expect(captured).toBe("abc123");
  });

  it("logger exposes info/warn/error methods", () => {
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });
});
