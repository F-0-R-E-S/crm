import { prisma } from "@/server/db";
import { Prisma } from "@prisma/client";
import type { ConversionKind } from "@prisma/client";

export type EmitConversionInput = {
	leadId: string;
	kind: ConversionKind;
	amount: Prisma.Decimal | number | string;
	currency?: string;
	occurredAt: Date;
	brokerReportedAt: Date;
};

/**
 * Idempotent conversion emit. A (leadId, kind) pair is unique for
 * REGISTRATION and FTD (first-time events). For REDEPOSIT we allow
 * multiple rows; caller must guarantee the broker-side dedup key is
 * enforced via `brokerReportedAt` + amount in the absence of a broker
 * event id.
 */
export async function emitConversion(input: EmitConversionInput) {
	const {
		leadId,
		kind,
		amount,
		currency = "USD",
		occurredAt,
		brokerReportedAt,
	} = input;

	if (currency !== "USD") {
		throw new Error(`multi-currency not supported in v1.0 (got ${currency})`);
	}

	if (kind === "REGISTRATION" || kind === "FTD") {
		const existing = await prisma.conversion.findFirst({
			where: { leadId, kind },
			select: { id: true },
		});
		if (existing) return existing;
	}

	return prisma.conversion.create({
		data: {
			leadId,
			kind,
			amount: new Prisma.Decimal(amount),
			currency,
			occurredAt,
			brokerReportedAt,
		},
	});
}
