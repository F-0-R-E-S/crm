import { router } from "@/server/trpc";
import { contactRouter } from "./contact";
import { dealRouter } from "./deal";
import { activityRouter } from "./activity";

export const appRouter = router({
  contact: contactRouter,
  deal: dealRouter,
  activity: activityRouter,
});

export type AppRouter = typeof appRouter;
