import { describe, expect, it } from "vitest";
import { computeRowHash, verifyChain } from "./hash-chain";

describe("hash-chain", () => {
  it("computeRowHash детерминирован и меняется при изменении payload", () => {
    const h1 = computeRowHash(null, { action: "x", targetId: "1" });
    const h2 = computeRowHash(null, { action: "x", targetId: "1" });
    const h3 = computeRowHash(null, { action: "y", targetId: "1" });
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it("verifyChain возвращает true для неповреждённой цепочки", () => {
    const r1 = { prevHash: null as string | null, payload: { a: 1 } };
    const h1 = computeRowHash(r1.prevHash, r1.payload);
    const r2 = { prevHash: h1 as string | null, payload: { a: 2 } };
    const h2 = computeRowHash(r2.prevHash, r2.payload);
    expect(
      verifyChain([
        { prevHash: r1.prevHash, rowHash: h1, payload: r1.payload },
        { prevHash: r2.prevHash, rowHash: h2, payload: r2.payload },
      ]),
    ).toEqual({ ok: true });
  });

  it("verifyChain ловит подмену", () => {
    const tampered = computeRowHash(null, { a: 999 });
    const res = verifyChain([{ prevHash: null, rowHash: tampered, payload: { a: 1 } }]);
    expect(res.ok).toBe(false);
  });
});
