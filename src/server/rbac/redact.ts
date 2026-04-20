import type { UserRole } from "@prisma/client";
import { type RbacEntity, hasFullAccess, visibleFieldsFor } from "./column-visibility";

export function redact<T extends Record<string, unknown>>(
	row: T,
	role: UserRole,
	entity: RbacEntity,
): Partial<T> {
	if (hasFullAccess(role, entity)) return row;
	const visible = visibleFieldsFor(role, entity);
	const out: Record<string, unknown> = {};
	for (const k of Object.keys(row)) {
		if (visible.has(k)) out[k] = row[k];
	}
	return out as Partial<T>;
}

export function redactMany<T extends Record<string, unknown>>(
	rows: T[],
	role: UserRole,
	entity: RbacEntity,
): Partial<T>[] {
	if (hasFullAccess(role, entity)) return rows;
	return rows.map((r) => redact(r, role, entity));
}
