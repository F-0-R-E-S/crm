import { prisma } from "@/server/db";
import { logger } from "@/server/observability";
import { emitTelegramEvent } from "@/server/telegram/emit";
import { type Rule, rules as defaultRules } from "./rules";

export interface EvaluationSummary {
  triggered: string[];
  resolved: string[];
  errors: Array<{ ruleKey: string; message: string }>;
}

/**
 * Evaluate all rules at `now`. For each rule:
 *  - If it returns null → auto-resolve any open AlertLog rows for that rule.
 *  - If it returns a trigger → insert a new AlertLog row (deduped inside the
 *    rule's window), emit Telegram + structured log.
 * Rule errors are captured per-rule; one broken rule never blocks the others.
 */
export async function evaluateAlerts(
  now: Date = new Date(),
  rules: Rule[] = defaultRules,
): Promise<EvaluationSummary> {
  const out: EvaluationSummary = { triggered: [], resolved: [], errors: [] };

  for (const rule of rules) {
    try {
      const trigger = await rule.evaluate(now);
      if (!trigger) {
        const res = await prisma.alertLog.updateMany({
          where: { ruleKey: rule.key, resolvedAt: null },
          data: { resolvedAt: now },
        });
        if (res.count > 0) out.resolved.push(rule.key);
        continue;
      }

      const windowAgo = new Date(now.getTime() - rule.windowSeconds * 1000);
      const existing = await prisma.alertLog.findFirst({
        where: {
          ruleKey: rule.key,
          resolvedAt: null,
          triggeredAt: { gte: windowAgo },
        },
      });
      if (existing) continue; // deduped

      const created = await prisma.alertLog.create({
        data: {
          ruleKey: rule.key,
          severity: trigger.severity,
          triggeredAt: now,
          windowStart: trigger.windowStart,
          windowEnd: trigger.windowEnd,
          measurement: trigger.measurement as object,
          message: trigger.message,
        },
      });
      out.triggered.push(rule.key);
      logger.warn({
        event: "alert.triggered",
        rule_key: rule.key,
        severity: trigger.severity,
        message: trigger.message,
        alert_id: created.id,
      });
      void emitTelegramEvent("ALERT_TRIGGERED", {
        rule_key: rule.key,
        severity: trigger.severity,
        message: trigger.message,
        alert_id: created.id,
      }).catch((e) => {
        logger.warn({ event: "alert.telegram_emit_failed", err: (e as Error).message });
      });
    } catch (e) {
      const message = (e as Error).message;
      logger.error({ event: "alert.evaluator_error", rule_key: rule.key, err: message });
      out.errors.push({ ruleKey: rule.key, message });
    }
  }

  return out;
}
