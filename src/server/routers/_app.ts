import { router } from "../trpc";
import { leadRouter } from "./lead";
import { affiliateRouter } from "./affiliate";

export const appRouter = router({
  lead: leadRouter,
  affiliate: affiliateRouter,
});
export type AppRouter = typeof appRouter;
