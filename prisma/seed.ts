// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  console.log("seed stub — replaced in Task 8");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
