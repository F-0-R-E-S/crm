import { redis } from "@/server/redis";

export interface WrrTarget {
  id: string;
  weight: number;
}
export interface WrrDecision {
  id: string;
  algorithmUsed: "weighted_round_robin";
  traceToken: string;
}

function cursorKey(flowVersionKey: string) {
  return `wrr:cursor:${flowVersionKey}`;
}

export async function resetWrrCursor(flowVersionKey: string) {
  await redis.del(cursorKey(flowVersionKey));
}

/**
 * Smooth Weighted Round-Robin (Nginx-style current-weight algorithm).
 * State stored in Redis as packed string: "id1:current|id2:current|...".
 * Deterministic, atomic via Lua.
 */
export async function selectWeighted(
  flowVersionKey: string,
  targets: WrrTarget[],
): Promise<WrrDecision> {
  if (targets.length === 0) throw new Error("no_targets");
  for (const t of targets) {
    if (!Number.isInteger(t.weight) || t.weight < 1 || t.weight > 1000)
      throw new Error("invalid_weight");
  }
  const key = cursorKey(flowVersionKey);
  const LUA = `
    local key = KEYS[1]
    local state_raw = redis.call('GET', key)
    local ids = {}
    local weights = {}
    local current = {}
    for i = 1, #ARGV, 2 do
      table.insert(ids, ARGV[i])
      table.insert(weights, tonumber(ARGV[i+1]))
    end
    local known = {}
    if state_raw then
      for pair in string.gmatch(state_raw, "([^|]+)") do
        local id, cur = string.match(pair, "([^:]+):(-?%d+)")
        if id then known[id] = tonumber(cur) end
      end
    end
    local total = 0
    for i, _ in ipairs(ids) do
      current[i] = (known[ids[i]] or 0) + weights[i]
      total = total + weights[i]
    end
    local best = 1
    for i = 2, #ids do if current[i] > current[best] then best = i end end
    current[best] = current[best] - total
    local out = {}
    for i, id in ipairs(ids) do
      table.insert(out, id .. ":" .. tostring(current[i]))
    end
    redis.call('SET', key, table.concat(out, "|"), 'EX', 86400)
    return ids[best]
  `;
  const args: string[] = [];
  for (const t of targets) args.push(t.id, String(t.weight));
  const pick = (await redis.eval(LUA, 1, key, ...args)) as string;
  return {
    id: pick,
    algorithmUsed: "weighted_round_robin",
    traceToken: `wrr:${flowVersionKey}:${Date.now().toString(36)}`,
  };
}
