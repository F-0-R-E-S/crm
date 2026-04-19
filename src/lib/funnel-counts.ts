import type { LeadStateKey } from "./tokens";

export interface LeadLike {
  state: LeadStateKey;
  rejectReason?: string | null;
}

export interface FunnelCounts {
  received: number;
  validated: number;
  rejected: number;
  routed: number;
  no_broker: number;
  pushed: number;
  push_failed: number;
  accepted: number;
  declined: number;
  ftd: number;
}

const ROUTED_STATES: LeadStateKey[] = [
  "PUSHING",
  "PUSHED",
  "ACCEPTED",
  "FTD",
  "DECLINED",
  "FAILED",
];

export function funnelCounts(leads: LeadLike[]): FunnelCounts {
  const out: FunnelCounts = {
    received: 0,
    validated: 0,
    rejected: 0,
    routed: 0,
    no_broker: 0,
    pushed: 0,
    push_failed: 0,
    accepted: 0,
    declined: 0,
    ftd: 0,
  };
  for (const l of leads) {
    out.received++;
    if (l.state === "REJECTED") {
      out.rejected++;
      continue;
    }
    out.validated++;
    if (ROUTED_STATES.includes(l.state)) out.routed++;
    if (l.state === "FAILED" && l.rejectReason === "no_broker_available") out.no_broker++;
    if (l.state === "PUSHED" || l.state === "PUSHING") out.pushed++;
    if (l.state === "ACCEPTED") out.accepted++;
    if (l.state === "DECLINED") out.declined++;
    if (l.state === "FTD") out.ftd++;
    if (l.state === "FAILED" && l.rejectReason !== "no_broker_available") out.push_failed++;
  }
  return out;
}
