import type { UserRole } from "@prisma/client";

export type RbacEntity = "Lead" | "Broker" | "Affiliate";

// Lowercase entity keys, sets of visible field names, or "ALL" for full access.
const MATRIX: Record<UserRole, Record<RbacEntity, Set<string> | "ALL">> = {
	ADMIN: {
		Lead: "ALL",
		Broker: "ALL",
		Affiliate: "ALL",
	},
	OPERATOR: {
		Lead: "ALL",
		Broker: "ALL",
		Affiliate: "ALL",
	},
	AFFILIATE_VIEWER: {
		Lead: new Set([
			"id",
			"externalLeadId",
			"firstName",
			"lastName",
			"geo",
			"state",
			"rejectReason",
			"subId",
			"utm",
			"affiliateId",
			"receivedAt",
			"createdAt",
			"updatedAt",
			"traceId",
		]),
		Broker: new Set(["id", "name", "isActive"]),
		Affiliate: new Set([
			"id",
			"name",
			"isActive",
			"contactEmail",
			"totalDailyCap",
			"createdAt",
			"updatedAt",
		]),
	},
	BROKER_VIEWER: {
		Lead: new Set([
			"id",
			"externalLeadId",
			"firstName",
			"lastName",
			"email",
			"phone",
			"geo",
			"state",
			"brokerId",
			"brokerExternalId",
			"lastBrokerStatus",
			"lastPushAt",
			"acceptedAt",
			"ftdAt",
			"createdAt",
			"updatedAt",
			"traceId",
		]),
		Broker: "ALL",
		Affiliate: new Set(["id", "name", "isActive"]),
	},
};

// An "all" set: has() returns true for every key. Callers treat this as no-redaction.
const ALL_SET = new Proxy(new Set<string>(), {
	get(target, prop, receiver) {
		if (prop === "has") return (_: string) => true;
		return Reflect.get(target, prop, receiver);
	},
}) as Set<string>;

export function visibleFieldsFor(role: UserRole, entity: RbacEntity): Set<string> {
	const spec = MATRIX[role][entity];
	if (spec === "ALL") return ALL_SET;
	return spec;
}

export function hasFullAccess(role: UserRole, entity: RbacEntity): boolean {
	return MATRIX[role][entity] === "ALL";
}
