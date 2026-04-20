import { seedBrokerTemplates } from "@/server/broker-template/seed";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDb } from "../helpers/db";

const NAMED_SLUGS = [
  "octafx-style-v1",
  "expertoption-style-v1",
  "iqoption-style-v1",
  "plus500-style-v1",
  "fbs-style-v1",
  "binarycent-style-v1",
  "olymptrade-style-v1",
  "pocketoption-style-v1",
  "quotex-style-v1",
  "xm-style-v1",
];

describe("seedBrokerTemplates v2 (named vendor templates)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("seeds >=10 named templates on first run and is idempotent", async () => {
    const first = await seedBrokerTemplates();
    const second = await seedBrokerTemplates();

    expect(first).toBe(second);
    expect(first).toBeGreaterThanOrEqual(30);

    const named = await prisma.brokerTemplate.findMany({
      where: { slug: { in: NAMED_SLUGS } },
    });
    expect(named).toHaveLength(10);
  });
});
