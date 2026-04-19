export interface PostbackMacros {
  sub_id: string;
  status: string;
  payout: string;
  lead_id: string;
  event_ts: string;
  trace_id: string;
  broker_id: string;
}

const MACRO_KEYS: (keyof PostbackMacros)[] = ["sub_id", "status", "payout", "lead_id", "event_ts", "trace_id", "broker_id"];

export function renderPostbackUrl(template: string, macros: PostbackMacros): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => {
    if ((MACRO_KEYS as string[]).includes(k)) return encodeURIComponent(macros[k as keyof PostbackMacros]);
    return `{${k}}`;
  });
}
