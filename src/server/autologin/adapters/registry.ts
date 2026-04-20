import type { BrokerLoginAdapter } from "./base";
import { mockAdapter } from "./mock";

const adapters: Record<string, BrokerLoginAdapter> = { [mockAdapter.id]: mockAdapter };

export function getAdapter(id: string): BrokerLoginAdapter | null {
  return adapters[id] ?? null;
}

export function registerAdapter(a: BrokerLoginAdapter): void {
  adapters[a.id] = a;
}
