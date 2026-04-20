import { createHash, randomBytes } from "node:crypto";
import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function sha256(s: string) {
  return createHash("sha256").update(s).digest("hex");
}

async function main() {
  // --- Admin user ---
  const adminHash = await bcrypt.hash("changeme", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@gambchamp.local" },
    update: {},
    create: { email: "admin@gambchamp.local", passwordHash: adminHash, role: UserRole.ADMIN },
  });
  console.log(`admin: ${admin.email} / changeme`);

  // --- Test affiliate + API key ---
  const aff = await prisma.affiliate.upsert({
    where: { id: "seed-affiliate-1" },
    update: {},
    create: {
      id: "seed-affiliate-1",
      name: "Test Affiliate",
      contactEmail: "aff@example.com",
      totalDailyCap: 1000,
      postbackUrl:
        "http://localhost:4001/tracker?click_id={sub_id}&status={status}&payout={payout}",
      postbackEvents: ["lead_pushed", "ftd", "declined"],
    },
  });
  const rawKey = `ak_${randomBytes(24).toString("hex")}`;
  await prisma.apiKey.upsert({
    where: { keyHash: sha256(rawKey) },
    update: {},
    create: {
      affiliateId: aff.id,
      keyHash: sha256(rawKey),
      keyPrefix: rawKey.slice(0, 12),
      label: "seed-key",
    },
  });
  console.log(`affiliate API key (SAVE — shown only here): ${rawKey}`);

  // --- Mock broker (points at local echo server started in tests) ---
  const broker = await prisma.broker.upsert({
    where: { id: "seed-broker-1" },
    update: {},
    create: {
      id: "seed-broker-1",
      name: "Mock Broker",
      dailyCap: 500,
      endpointUrl: "http://localhost:4000/push",
      fieldMapping: {
        firstName: "first_name",
        lastName: "last_name",
        email: "email",
        phone: "phone",
        geo: "country",
      },
      postbackSecret: "seed-secret-change-me",
      postbackLeadIdPath: "lead_id",
      postbackStatusPath: "status",
      statusMapping: { accepted: "ACCEPTED", declined: "DECLINED", ftd: "FTD" },
      responseIdPath: "id",
    },
  });

  await prisma.rotationRule.upsert({
    where: { geo_brokerId: { geo: "XX", brokerId: broker.id } },
    update: {},
    create: { geo: "XX", brokerId: broker.id, priority: 1 },
  });

  // --- Default global FraudPolicy ---
  await prisma.fraudPolicy.upsert({
    where: { name: "global" },
    update: {},
    create: { name: "global" },
  });
  console.log("fraud policy: global (defaults)");

  console.log("seed complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
