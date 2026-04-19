import { router } from "../trpc";
import { affiliateRouter } from "./affiliate";
import { blacklistRouter } from "./blacklist";
import { brokerRouter } from "./broker";
import { leadRouter } from "./lead";
import { rotationRouter } from "./rotation";

export const appRouter = router({
  lead: leadRouter,
  affiliate: affiliateRouter,
  broker: brokerRouter,
  rotation: rotationRouter,
  blacklist: blacklistRouter,
});
export type AppRouter = typeof appRouter;
