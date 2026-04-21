import { rbacPreviewRouter } from "../rbac/preview";
import { router } from "../trpc";
import { affiliateRouter } from "./affiliate";
import { alertLogRouter } from "./alertLog";
import { analyticsRouter } from "./analytics";
import { auditRouter } from "./audit";
import { blacklistRouter } from "./blacklist";
import { brokerRouter } from "./broker";
import { brokerTemplateRouter } from "./brokerTemplate";
import { financeRouter } from "./finance";
import { leadRouter } from "./lead";
import { manualReviewRouter } from "./manualReview";
import { onboardingRouter } from "./onboarding";
import { rotationRouter } from "./rotation";
import { routingRouter } from "./routing";
import { scheduledChangeRouter } from "./scheduledChange";
import { statusMappingRouter } from "./statusMapping";
import { telegramRouter } from "./telegram";
import { tenantRouter } from "./tenant";
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
  alertLog: alertLogRouter,
  manualReview: manualReviewRouter,
  rbacPreview: rbacPreviewRouter,
  analytics: analyticsRouter,
  telegram: telegramRouter,
  finance: financeRouter,
  onboarding: onboardingRouter,
  scheduledChange: scheduledChangeRouter,
  statusMapping: statusMappingRouter,
  tenant: tenantRouter,
});
export type AppRouter = typeof appRouter;
