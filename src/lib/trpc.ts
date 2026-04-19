"use client";
import type { AppRouter } from "@/server/routers/_app";
import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { inferRouterOutputs } from "@trpc/server";
import superjson from "superjson";

export const trpc = createTRPCReact<AppRouter>();

export type RouterOutputs = inferRouterOutputs<AppRouter>;

export const trpcClient = trpc.createClient({
  links: [httpBatchLink({ url: "/api/trpc", transformer: superjson })],
});
