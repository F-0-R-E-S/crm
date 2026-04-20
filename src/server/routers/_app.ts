import { router } from "../trpc";
import { affiliateRouter } from "./affiliate";
import { auditRouter } from "./audit";
import { blacklistRouter } from "./blacklist";
import { brokerRouter } from "./broker";
import { brokerTemplateRouter } from "./brokerTemplate";
import { leadRouter } from "./lead";
import { manualReviewRouter } from "./manualReview";
import { rotationRouter } from "./rotation";
import { routingRouter } from "./routing";
import { userRouter } from "./user";

export const appRouter = router({
  lead: leadRouter,
  affiliate: affiliateRouter,
  broker: brokerRouter,
  brokerTemplate: brokerTemplateRouter,
  rotation: rotationRouter,
  routing: routingRouter,
  blacklist: blacklistRouter,
  user: userRouter,
  audit: auditRouter,
  manualReview: manualReviewRouter,
});
export type AppRouter = typeof appRouter;
