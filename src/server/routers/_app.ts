import { router } from "../trpc";
import { leadRouter } from "./lead";
import { affiliateRouter } from "./affiliate";
import { brokerRouter } from "./broker";
import { rotationRouter } from "./rotation";

export const appRouter = router({
  lead: leadRouter,
  affiliate: affiliateRouter,
  broker: brokerRouter,
  rotation: rotationRouter,
});
export type AppRouter = typeof appRouter;
