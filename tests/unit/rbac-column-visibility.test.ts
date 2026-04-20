import { visibleFieldsFor } from "@/server/rbac/column-visibility";
import { redact, redactMany } from "@/server/rbac/redact";
import { describe, expect, it } from "vitest";

describe("visibleFieldsFor", () => {
	it("ADMIN sees all Lead fields (no redaction)", () => {
		const s = visibleFieldsFor("ADMIN", "Lead");
		expect(s.has("phone")).toBe(true);
		expect(s.has("email")).toBe(true);
		expect(s.has("brokerExternalId")).toBe(true);
	});

	it("AFFILIATE_VIEWER cannot see phone/email/brokerExternalId on Lead", () => {
		const s = visibleFieldsFor("AFFILIATE_VIEWER", "Lead");
		expect(s.has("firstName")).toBe(true);
		expect(s.has("lastName")).toBe(true);
		expect(s.has("geo")).toBe(true);
		expect(s.has("phone")).toBe(false);
		expect(s.has("email")).toBe(false);
		expect(s.has("brokerExternalId")).toBe(false);
	});

	it("BROKER_VIEWER cannot see affiliate-side subId/utm on Lead", () => {
		const s = visibleFieldsFor("BROKER_VIEWER", "Lead");
		expect(s.has("subId")).toBe(false);
		expect(s.has("utm")).toBe(false);
		expect(s.has("phone")).toBe(true); // broker-side needs phone/email
	});
});

describe("redact", () => {
	it("returns row with hidden fields removed for role", () => {
		const lead = {
			id: "1",
			firstName: "a",
			lastName: "b",
			email: "x@y.io",
			phone: "+100",
			geo: "US",
			brokerExternalId: "ext-99",
		};
		const redacted = redact(lead, "AFFILIATE_VIEWER", "Lead");
		expect(redacted.firstName).toBe("a");
		expect(redacted.geo).toBe("US");
		expect((redacted as Record<string, unknown>).phone).toBeUndefined();
		expect((redacted as Record<string, unknown>).email).toBeUndefined();
		expect((redacted as Record<string, unknown>).brokerExternalId).toBeUndefined();
	});

	it("redactMany redacts each row", () => {
		const rows = [
			{ id: "1", phone: "+1", geo: "US" },
			{ id: "2", phone: "+2", geo: "DE" },
		];
		const out = redactMany(rows, "AFFILIATE_VIEWER", "Lead");
		expect(out).toHaveLength(2);
		expect((out[0] as Record<string, unknown>).phone).toBeUndefined();
		expect((out[0] as Record<string, unknown>).geo).toBe("US");
	});
});
