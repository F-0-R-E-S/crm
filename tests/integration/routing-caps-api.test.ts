import { GET as getCaps, PUT as putCaps } from "@/app/api/v1/routing/caps/[flowId]/route";
import { POST as postPublish } from "@/app/api/v1/routing/flows/[flowId]/publish/route";
import { POST as postCreate } from "@/app/api/v1/routing/flows/route";
import { prisma } from "@/server/db";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb } from "../helpers/db";

vi.mock("@/auth", () => ({
  auth: async () => ({ user: { id: "u-admin", role: "ADMIN" } }),
}));

const graph = {
  nodes: [
    { id: "e", kind: "Entry" },
    { id: "a", kind: "Algorithm", mode: "WEIGHTED_ROUND_ROBIN" },
    { id: "t", kind: "BrokerTarget", brokerId: "bX", weight: 100 },
    { id: "x", kind: "Exit" },
  ],
  edges: [
    { from: "e", to: "a", condition: "default" },
    { from: "a", to: "t", condition: "default" },
    { from: "t", to: "x", condition: "default" },
  ],
};

async function createFlow() {
  const res = await postCreate(
    new Request("http://x/api/v1/routing/flows", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "CapsAPI", timezone: "UTC", graph }),
    }),
  );
  return (await res.json()) as { id: string; versions: { id: string }[] };
}

describe("REST /api/v1/routing/caps/:flowId", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("PUT создаёт perCountry cap + countryLimits (roundtrip persists)", async () => {
    const flow = await createFlow();

    const put = await putCaps(
      new Request(`http://x/api/v1/routing/caps/${flow.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caps: [
            {
              scope: "BROKER",
              scopeRefId: "bX",
              window: "DAILY",
              limit: 999,
              timezone: "UTC",
              perCountry: true,
              countryLimits: [
                { country: "de", limit: 10 },
                { country: "UK", limit: 20 },
              ],
            },
          ],
        }),
      }),
      { params: Promise.resolve({ flowId: flow.id }) },
    );
    expect(put.status).toBe(200);
    const putBody = await put.json();
    expect(putBody.caps).toHaveLength(1);
    expect(putBody.caps[0].per_country).toBe(true);
    // Country codes must be normalised to uppercase.
    const countries = putBody.caps[0].country_limits
      .map((cl: { country: string }) => cl.country)
      .sort();
    expect(countries).toEqual(["DE", "UK"]);

    // Roundtrip: query Prisma directly to confirm persistence.
    const defs = await prisma.capDefinition.findMany({
      where: { flowVersionId: flow.versions[0].id },
      include: { countryLimits: true },
    });
    expect(defs).toHaveLength(1);
    expect(defs[0].perCountry).toBe(true);
    expect(defs[0].countryLimits).toHaveLength(2);
    const persistedCountries = defs[0].countryLimits.map((cl) => cl.country).sort();
    expect(persistedCountries).toEqual(["DE", "UK"]);
    const deLimit = defs[0].countryLimits.find((cl) => cl.country === "DE");
    expect(deLimit?.limit).toBe(10);
    const ukLimit = defs[0].countryLimits.find((cl) => cl.country === "UK");
    expect(ukLimit?.limit).toBe(20);
  });

  it("PUT заменяет существующие cap rows (upsert semantics)", async () => {
    const flow = await createFlow();

    await putCaps(
      new Request(`http://x/api/v1/routing/caps/${flow.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caps: [
            {
              scope: "BROKER",
              scopeRefId: "bX",
              window: "DAILY",
              limit: 100,
              timezone: "UTC",
              perCountry: true,
              countryLimits: [{ country: "DE", limit: 5 }],
            },
          ],
        }),
      }),
      { params: Promise.resolve({ flowId: flow.id }) },
    );

    // Re-PUT: different set — no perCountry, no limits.
    await putCaps(
      new Request(`http://x/api/v1/routing/caps/${flow.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caps: [
            {
              scope: "BROKER",
              scopeRefId: "bX",
              window: "DAILY",
              limit: 200,
              timezone: "UTC",
              perCountry: false,
              countryLimits: [],
            },
          ],
        }),
      }),
      { params: Promise.resolve({ flowId: flow.id }) },
    );

    const defs = await prisma.capDefinition.findMany({
      where: { flowVersionId: flow.versions[0].id },
      include: { countryLimits: true },
    });
    expect(defs).toHaveLength(1);
    expect(defs[0].limit).toBe(200);
    expect(defs[0].perCountry).toBe(false);
    expect(defs[0].countryLimits).toHaveLength(0);
  });

  it("GET возвращает per_country + country_limits (после publish)", async () => {
    const flow = await createFlow();

    await putCaps(
      new Request(`http://x/api/v1/routing/caps/${flow.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          caps: [
            {
              scope: "BROKER",
              scopeRefId: "bX",
              window: "DAILY",
              limit: 999,
              timezone: "UTC",
              perCountry: true,
              countryLimits: [{ country: "DE", limit: 10 }],
            },
          ],
        }),
      }),
      { params: Promise.resolve({ flowId: flow.id }) },
    );

    const pub = await postPublish(
      new Request(`http://x/api/v1/routing/flows/${flow.id}/publish`, { method: "POST" }),
      { params: Promise.resolve({ flowId: flow.id }) },
    );
    expect(pub.status).toBe(200);

    const get = await getCaps(new Request(`http://x/api/v1/routing/caps/${flow.id}`), {
      params: Promise.resolve({ flowId: flow.id }),
    });
    expect(get.status).toBe(200);
    const body = await get.json();
    expect(body.caps).toHaveLength(1);
    expect(body.caps[0].per_country).toBe(true);
    expect(body.caps[0].country_limits).toEqual([{ country: "DE", limit: 10 }]);
  });

  it("publish с perCountry=true + пустой countryLimits → 422 PER_COUNTRY_CAP_HAS_NO_LIMITS", async () => {
    const flow = await createFlow();

    // Seed an invalid cap directly: perCountry=true, no limits.
    await prisma.capDefinition.create({
      data: {
        flowVersionId: flow.versions[0].id,
        scope: "BROKER",
        scopeRefId: "bX",
        window: "DAILY",
        limit: 100,
        timezone: "UTC",
        perCountry: true,
      },
    });

    const pub = await postPublish(
      new Request(`http://x/api/v1/routing/flows/${flow.id}/publish`, { method: "POST" }),
      { params: Promise.resolve({ flowId: flow.id }) },
    );
    expect(pub.status).toBe(422);
    const body = await pub.json();
    expect(body.error.code).toBe("flow_validation_error");
    const found = (body.error.details as { code: string }[]).find(
      (d) => d.code === "PER_COUNTRY_CAP_HAS_NO_LIMITS",
    );
    expect(found).toBeTruthy();
  });

  it("PUT с невалидным телом → 422", async () => {
    const flow = await createFlow();
    const bad = await putCaps(
      new Request(`http://x/api/v1/routing/caps/${flow.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ caps: [{ scope: "BROKER" }] }),
      }),
      { params: Promise.resolve({ flowId: flow.id }) },
    );
    expect(bad.status).toBe(422);
  });
});
