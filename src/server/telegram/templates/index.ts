import type { TelegramEventType } from "../event-catalog";
import { render as renderAccepted } from "./accepted";
import { render as renderAffiliateDailySummary } from "./affiliate-daily-summary";
import { render as renderAffiliateFtd } from "./affiliate-ftd";
import { render as renderAnomalyDetected } from "./anomaly-detected";
import { render as renderAutologinDown } from "./autologin-down";
import { render as renderAutologinSlaBreached } from "./autologin-sla-breached";
import { render as renderBrokerConfigChanged } from "./broker-config-changed";
import { render as renderBrokerDown } from "./broker-down";
import { render as renderBrokerRecovered } from "./broker-recovered";
import { render as renderCapReached } from "./cap-reached";
import { render as renderDailySummary } from "./daily-summary";
import { render as renderDeclined } from "./declined";
import { render as renderFailed } from "./failed";
import { render as renderFraudHit } from "./fraud-hit";
import { render as renderFraudPolicyChanged } from "./fraud-policy-changed";
import { render as renderFtd } from "./ftd";
import { render as renderManualReviewQueued } from "./manual-review-queued";
import { render as renderNewLead } from "./new-lead";
import { render as renderPendingHoldReleased } from "./pending-hold-released";
import { render as renderPendingHoldStart } from "./pending-hold-start";
import { render as renderProxyPoolDegraded } from "./proxy-pool-degraded";
import { render as renderPushed } from "./pushed";
import { render as renderShaveSuspected } from "./shave-suspected";

export type Renderer = (p: Record<string, unknown>) => string;

export const TEMPLATES: Partial<Record<TelegramEventType, Renderer>> = {
  NEW_LEAD: renderNewLead,
  PUSHED: renderPushed,
  ACCEPTED: renderAccepted,
  DECLINED: renderDeclined,
  FTD: renderFtd,
  FAILED: renderFailed,
  FRAUD_HIT: renderFraudHit,
  MANUAL_REVIEW_QUEUED: renderManualReviewQueued,
  PENDING_HOLD_START: renderPendingHoldStart,
  PENDING_HOLD_RELEASED: renderPendingHoldReleased,
  SHAVE_SUSPECTED: renderShaveSuspected,
  BROKER_DOWN: renderBrokerDown,
  BROKER_RECOVERED: renderBrokerRecovered,
  CAP_REACHED: renderCapReached,
  AUTOLOGIN_DOWN: renderAutologinDown,
  AUTOLOGIN_SLA_BREACHED: renderAutologinSlaBreached,
  PROXY_POOL_DEGRADED: renderProxyPoolDegraded,
  DAILY_SUMMARY: renderDailySummary,
  ANOMALY_DETECTED: renderAnomalyDetected,
  FRAUD_POLICY_CHANGED: renderFraudPolicyChanged,
  BROKER_CONFIG_CHANGED: renderBrokerConfigChanged,
  AFFILIATE_DAILY_SUMMARY: renderAffiliateDailySummary,
  AFFILIATE_FTD: renderAffiliateFtd,
};

export function fallbackRender(p: Record<string, unknown>): string {
  return `*Event*\n\`\`\`\n${JSON.stringify(p).slice(0, 3900)}\n\`\`\``;
}
