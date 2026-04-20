import { useMemo } from "react";

type Row = Record<string, unknown>;

/**
 * Given a list of rows and a set of candidate column keys, return the subset
 * of keys that have at least one non-empty value across the rows. Used to
 * auto-hide columns that would be blank for every row — e.g. when a role has
 * redaction applied server-side and every `phone` field comes back undefined.
 */
export function useVisibleColumns<T extends Row>(
	rows: T[],
	candidates: (keyof T)[],
): (keyof T)[] {
	return useMemo(() => {
		return candidates.filter((k) =>
			rows.some((r) => r[k] !== undefined && r[k] !== null && r[k] !== ""),
		);
	}, [rows, candidates]);
}
