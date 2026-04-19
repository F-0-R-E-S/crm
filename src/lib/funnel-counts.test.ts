import { describe, expect, it } from "vitest";
import { funnelCounts, type LeadLike } from "./funnel-counts";

const lead = (state: LeadLike["state"]): LeadLike => ({ state });

describe("funnelCounts", () => {
  it("routes VALIDATING / PUSHING / PUSHED / ACCEPTED / FTD / DECLINED / FAILED to 'routed'", () => {
    const leads: LeadLike[] = [lead("PUSHED"), lead("ACCEPTED"), lead("FTD"), lead("DECLINED"), lead("PUSHING"), lead("FAILED")];
    const c = funnelCounts(leads);
    expect(c.received).toBe(6);
    expect(c.rejected).toBe(0);
    expect(c.validated).toBe(6);
    expect(c.routed).toBe(6);
  });
  it("counts REJECTED as non-validated", () => {
    const c = funnelCounts([lead("REJECTED"), lead("REJECTED"), lead("PUSHED")]);
    expect(c.rejected).toBe(2);
    expect(c.validated).toBe(1);
  });
  it("splits outcome into ftd/accepted/declined/push_failed", () => {
    const c = funnelCounts([lead("FTD"), lead("FTD"), lead("ACCEPTED"), lead("DECLINED"), lead("FAILED")]);
    expect(c.ftd).toBe(2);
    expect(c.accepted).toBe(1);
    expect(c.declined).toBe(1);
    expect(c.push_failed).toBe(1);
  });
  it("no_broker is 0 for now (backend does not emit this state yet)", () => {
    const c = funnelCounts([lead("FAILED")]);
    expect(c.no_broker).toBe(0);
  });
});
