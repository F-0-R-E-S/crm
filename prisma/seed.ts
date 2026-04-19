import { PrismaClient, DealStage, ActivityType, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      name: "Admin",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const acme = await prisma.company.upsert({
    where: { domain: "acme.test" },
    update: {},
    create: {
      name: "Acme Corp",
      domain: "acme.test",
      industry: "Manufacturing",
      size: "201-500",
    },
  });

  const globex = await prisma.company.upsert({
    where: { domain: "globex.test" },
    update: {},
    create: {
      name: "Globex",
      domain: "globex.test",
      industry: "Software",
      size: "51-200",
    },
  });

  const alice = await prisma.contact.upsert({
    where: { email: "alice@acme.test" },
    update: {},
    create: {
      firstName: "Alice",
      lastName: "Anderson",
      email: "alice@acme.test",
      phone: "+1-555-0101",
      title: "VP Engineering",
      companyId: acme.id,
      ownerId: admin.id,
    },
  });

  const bob = await prisma.contact.upsert({
    where: { email: "bob@globex.test" },
    update: {},
    create: {
      firstName: "Bob",
      lastName: "Brown",
      email: "bob@globex.test",
      phone: "+1-555-0202",
      title: "CTO",
      companyId: globex.id,
      ownerId: admin.id,
    },
  });

  await prisma.deal.createMany({
    data: [
      {
        title: "Acme enterprise license",
        amount: "48000.00",
        stage: DealStage.PROPOSAL,
        closeDate: new Date(Date.now() + 14 * 24 * 3600 * 1000),
        contactId: alice.id,
        companyId: acme.id,
        ownerId: admin.id,
      },
      {
        title: "Globex pilot",
        amount: "12000.00",
        stage: DealStage.QUALIFIED,
        closeDate: new Date(Date.now() + 30 * 24 * 3600 * 1000),
        contactId: bob.id,
        companyId: globex.id,
        ownerId: admin.id,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.activity.createMany({
    data: [
      {
        type: ActivityType.CALL,
        subject: "Discovery call with Alice",
        dueAt: new Date(Date.now() + 24 * 3600 * 1000),
        assigneeId: admin.id,
        contactId: alice.id,
      },
      {
        type: ActivityType.EMAIL,
        subject: "Send proposal to Globex",
        dueAt: new Date(Date.now() + 2 * 24 * 3600 * 1000),
        assigneeId: admin.id,
        contactId: bob.id,
      },
    ],
  });

  console.log("Seed complete. Login: admin@example.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
