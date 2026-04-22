import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const brokers = [
    { name: "AvisuAds - Italy A", slug: "avisu-it-a" },
    { name: "AvisuAds - Italy B", slug: "avisu-it-b" },
    { name: "AvisuAds - Italy C", slug: "avisu-it-c" },
    { name: "AvisuAds - Fallback", slug: "avisu-it-fb" },
  ];
  for (const b of brokers) {
    const existing = await prisma.broker.findFirst({ where: { name: b.name } });
    if (existing) {
      console.log(`skip ${b.name} -> ${existing.id}`);
      continue;
    }
    const row = await prisma.broker.create({
      data: {
        name: b.name,
        endpointUrl: `https://avisu.example.com/${b.slug}/intake`,
        fieldMapping: { email: "email", phone: "phone", geo: "country_code" },
        postbackSecret: `sec_${b.slug}`,
        postbackLeadIdPath: "$.lead_id",
        postbackStatusPath: "$.status",
        httpMethod: "POST",
        isActive: true,
        lastHealthStatus: "healthy",
      },
    });
    console.log(`created ${b.name} -> ${row.id}`);
  }
  const all = await prisma.broker.findMany({
    where: { name: { startsWith: "AvisuAds" } },
    select: { id: true, name: true },
  });
  console.log("\nALL_IDS:", JSON.stringify(all, null, 2));
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
