"use server";

import { signIn } from "@/auth";
import { createAccount } from "@/server/onboarding/signup";
import { rateLimit } from "@/server/ratelimit";
import { headers } from "next/headers";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  orgName: z.string().min(2).max(60),
});

export interface SignupActionState {
  error?: string;
  ok?: boolean;
}

export async function signupAction(
  _prev: SignupActionState,
  formData: FormData,
): Promise<SignupActionState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    orgName: String(formData.get("orgName") ?? ""),
  };
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "invalid input" };
  }

  // Rate limit: 5 signups per hour per IP — blunts automated account farming.
  try {
    const h = await headers();
    const ip = (h.get("x-forwarded-for") ?? "").split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
    const ok = await rateLimit({
      key: `signup:${ip}`,
      limit: 5,
      windowSeconds: 3600,
    });
    if (!ok) {
      return { error: "too many signups from this ip; try again in an hour" };
    }
  } catch {
    // if redis is down we do not hard-block signup; logged at redis layer.
  }

  try {
    await createAccount(parsed.data);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "signup failed" };
  }
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: true,
      redirectTo: "/onboarding",
    });
  } catch (e) {
    // NextAuth throws a redirect exception on success — rethrow so Next.js handles it
    throw e;
  }
  return { ok: true };
}
