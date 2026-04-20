import { randomBytes } from "node:crypto";
import { prisma } from "@/server/db";
import bcrypt from "bcryptjs";

const TRIAL_DAYS = 14;

function slugify(name: string): string {
  const s = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return s.length > 0 ? s : "org";
}

async function uniqueSlug(base: string): Promise<string> {
  const existing = await prisma.org.findUnique({ where: { slug: base } });
  if (!existing) return base;
  return `${base}-${randomBytes(3).toString("hex")}`;
}

export interface CreateAccountInput {
  email: string;
  password: string;
  orgName: string;
}

export interface CreateAccountResult {
  userId: string;
  orgId: string;
  verificationUrl: string;
}

export async function createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  const email = input.email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("user with this email already exists");
  }

  const base = slugify(input.orgName);
  const slug = await uniqueSlug(base);
  const passwordHash = await bcrypt.hash(input.password, 12);

  const now = new Date();
  const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const { userId, orgId } = await prisma.$transaction(async (tx) => {
    const org = await tx.org.create({
      data: {
        name: input.orgName,
        slug,
        plan: "TRIAL",
        trialStartedAt: now,
        trialEndsAt,
      },
    });
    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "ADMIN",
        orgId: org.id,
      },
    });
    await tx.org.update({
      where: { id: org.id },
      data: { createdById: user.id },
    });
    await tx.onboardingProgress.create({
      data: { orgId: org.id, currentStep: 1 },
    });
    return { userId: user.id, orgId: org.id };
  });

  const token = randomBytes(24).toString("hex");
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const verificationUrl = `${appUrl}/verify?token=${token}`;
  // v1.0: stub email — real email in v1.5.
  console.log(`[signup] email verification URL for ${email}: ${verificationUrl}`);

  return { userId, orgId, verificationUrl };
}
