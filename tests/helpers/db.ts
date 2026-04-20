import { prisma } from "@/server/db";

export async function resetDb() {
  // Order matters: FKs first, then parents.
  // Flow.activeVersionId → FlowVersion: null it out before deleting FlowVersion.
  await prisma.flow.updateMany({ data: { activeVersionId: null } });
  await prisma.$transaction([
    prisma.capCounter.deleteMany(),
    prisma.capDefinition.deleteMany(),
    prisma.fallbackStep.deleteMany(),
    prisma.flowAlgorithmConfig.deleteMany(),
    prisma.flowBranch.deleteMany(),
    prisma.flowVersion.deleteMany(),
    prisma.flow.deleteMany(),
    prisma.webhookDelivery.deleteMany(),
    prisma.affiliateIntakeWebhook.deleteMany(),
    prisma.intakeSettings.deleteMany(),
    prisma.leadEvent.deleteMany(),
    prisma.outboundPostback.deleteMany(),
    prisma.postbackReceipt.deleteMany(),
    prisma.autologinAttempt.deleteMany(),
    prisma.proxyEndpoint.deleteMany(),
    prisma.manualReviewQueue.deleteMany(),
    prisma.analyticsShareLink.deleteMany(),
    prisma.analyticsPreset.deleteMany(),
    prisma.leadDailyRoll.deleteMany(),
    prisma.leadHourlyRoll.deleteMany(),
    prisma.telegramEventLog.deleteMany(),
    prisma.telegramSubscription.deleteMany(),
    prisma.telegramBotConfig.deleteMany(),
    prisma.lead.deleteMany(),
    prisma.idempotencyKey.deleteMany(),
    prisma.dailyCap.deleteMany(),
    prisma.brokerErrorSample.deleteMany(),
    prisma.brokerHealthCheck.deleteMany(),
    prisma.rotationRule.deleteMany(),
    prisma.broker.deleteMany(),
    prisma.brokerTemplate.deleteMany(),
    prisma.apiKey.deleteMany(),
    prisma.affiliate.deleteMany(),
    prisma.blacklist.deleteMany(),
    prisma.fraudPolicy.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}
