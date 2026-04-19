import { router } from "../trpc";
import { leadRouter } from "./lead";
import { affiliateRouter } from "./affiliate";
import { brokerRouter } from "./broker";

export const appRouter = router({
  lead: leadRouter,
  affiliate: affiliateRouter,
  broker: brokerRouter,
});
export type AppRouter = typeof appRouter;
