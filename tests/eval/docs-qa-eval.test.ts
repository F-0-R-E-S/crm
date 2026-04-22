import { describe, it, expect } from "vitest";
import qaSet from "./fixtures/qa-set.json";

const runEval = process.env.RUN_EVAL === "1";

describe.skipIf(!runEval)("docs Q&A eval set", () => {
  for (const pair of qaSet) {
    it(`Q: ${pair.q}`, async () => {
      const res = await fetch("http://localhost:3000/api/docs/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: pair.q }),
      });
      expect(res.status).toBe(200);
      const txt = await res.text();
      const answerFrames = [...txt.matchAll(/data: (\{[^}]+"t":[^}]+\})/g)].map((m) => JSON.parse(m[1]).t);
      const answer = answerFrames.join("");
      for (const must of pair.mustInclude) {
        expect(answer.toLowerCase()).toContain(must.toLowerCase());
      }
    }, 30_000);
  }
});
