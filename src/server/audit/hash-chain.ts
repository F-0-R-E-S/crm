import { createHmac } from "node:crypto";
import { env } from "@/lib/env";

function canonical(obj: unknown): string {
  if (obj === null || typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(canonical).join(",")}]`;
  const keys = Object.keys(obj as Record<string, unknown>).sort();
  return `{${keys
    .map(
      (k) =>
        `${JSON.stringify(k)}:${canonical((obj as Record<string, unknown>)[k])}`,
    )
    .join(",")}}`;
}

export function computeRowHash(prevHash: string | null, payload: unknown): string {
  const input = `${prevHash ?? ""}|${canonical(payload)}`;
  return createHmac("sha256", env.AUDIT_HASH_CHAIN_SECRET).update(input).digest("hex");
}

export interface ChainRow {
  prevHash: string | null;
  rowHash: string;
  payload: unknown;
}

export function verifyChain(
  rows: ChainRow[],
): { ok: true } | { ok: false; brokenAt: number } {
  let prev: string | null = null;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.prevHash !== prev) return { ok: false, brokenAt: i };
    const expected = computeRowHash(r.prevHash, r.payload);
    if (expected !== r.rowHash) return { ok: false, brokenAt: i };
    prev = r.rowHash;
  }
  return { ok: true };
}
