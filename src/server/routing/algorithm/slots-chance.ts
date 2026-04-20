import { randomBytes, randomInt } from "node:crypto";

export interface SlotsTarget {
  id: string;
  slots: number;
}
export interface ChanceTarget {
  id: string;
  chance: number;
}
export type ProbTarget = SlotsTarget | ChanceTarget;

export interface ProbDecision {
  id: string;
  algorithmUsed: "slots_chance";
  traceToken: string;
  drawNumerator: number;
  drawDenominator: number;
}

export type ValidationResult = { ok: true } | { ok: false; code: string; message: string };

export function validateSlotBounds(targets: SlotsTarget[]): ValidationResult {
  for (const t of targets) {
    if (!Number.isInteger(t.slots) || t.slots < 1 || t.slots > 10_000)
      return {
        ok: false,
        code: "invalid_slot_bounds",
        message: `slot ${t.id} out of [1..10000]`,
      };
  }
  return { ok: true };
}

export function validateChanceSum(targets: ChanceTarget[]): ValidationResult {
  const sum = targets.reduce((s, t) => s + t.chance, 0);
  if (Math.abs(sum - 100) > 0.01)
    return { ok: false, code: "invalid_probability_sum", message: `sum=${sum.toFixed(2)}` };
  for (const t of targets) {
    if (t.chance < 0.01 || t.chance > 100)
      return {
        ok: false,
        code: "invalid_chance_bounds",
        message: `chance ${t.id} out of [0.01..100]`,
      };
  }
  return { ok: true };
}

function isChanceTargets(t: ProbTarget[]): t is ChanceTarget[] {
  return t.length > 0 && "chance" in t[0];
}

export async function selectBySlotsOrChance(targets: ProbTarget[]): Promise<ProbDecision> {
  if (targets.length === 0) throw new Error("no_targets");
  const traceToken = `slots-chance:${randomBytes(16).toString("hex")}`;
  if (isChanceTargets(targets)) {
    const v = validateChanceSum(targets);
    if (!v.ok) throw new Error(v.code);
    const weights = targets.map((t) => Math.round(t.chance * 100));
    const total = weights.reduce((s, w) => s + w, 0);
    const draw = randomInt(0, total);
    let acc = 0;
    for (let i = 0; i < targets.length; i++) {
      acc += weights[i];
      if (draw < acc)
        return {
          id: targets[i].id,
          algorithmUsed: "slots_chance",
          traceToken,
          drawNumerator: draw,
          drawDenominator: total,
        };
    }
    return {
      id: targets[targets.length - 1].id,
      algorithmUsed: "slots_chance",
      traceToken,
      drawNumerator: draw,
      drawDenominator: total,
    };
  }
  const slots = targets as SlotsTarget[];
  const v = validateSlotBounds(slots);
  if (!v.ok) throw new Error(v.code);
  const total = slots.reduce((s, t) => s + t.slots, 0);
  const draw = randomInt(0, total);
  let acc = 0;
  for (const t of slots) {
    acc += t.slots;
    if (draw < acc)
      return {
        id: t.id,
        algorithmUsed: "slots_chance",
        traceToken,
        drawNumerator: draw,
        drawDenominator: total,
      };
  }
  return {
    id: slots[slots.length - 1].id,
    algorithmUsed: "slots_chance",
    traceToken,
    drawNumerator: draw,
    drawDenominator: total,
  };
}
