import { evaluateAlerts } from "@/server/alerts/evaluator";
import { JOB_NAMES, getBoss, startBossOnce } from "./queue";

export async function handleAlertsEvaluator(): Promise<void> {
  await evaluateAlerts();
}

export async function registerAlertsEvaluatorWorker(): Promise<void> {
  await startBossOnce();
  const boss = getBoss();
  await boss.work(JOB_NAMES.alertsEvaluator, async () => {
    await handleAlertsEvaluator();
  });
  await boss.schedule(JOB_NAMES.alertsEvaluator, "*/1 * * * *", {});
}
