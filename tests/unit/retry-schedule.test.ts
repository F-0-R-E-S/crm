import { DEFAULT_RETRY_LADDER, parseRetrySchedule } from "@/server/routing/retry-schedule";
import { describe, expect, it } from "vitest";

describe("parseRetrySchedule", () => {
	it("returns default ladder when input is undefined", () => {
		expect(parseRetrySchedule(undefined)).toEqual([...DEFAULT_RETRY_LADDER]);
	});

	it("returns default ladder when input is empty string", () => {
		expect(parseRetrySchedule("")).toEqual([...DEFAULT_RETRY_LADDER]);
	});

	it("parses a well-formed csv", () => {
		expect(parseRetrySchedule("5,30,120")).toEqual([5, 30, 120]);
	});

	it("trims whitespace around each entry", () => {
		expect(parseRetrySchedule(" 10, 60 , 300 ")).toEqual([10, 60, 300]);
	});

	it("drops non-numeric entries and falls back to default when nothing parses", () => {
		expect(parseRetrySchedule("foo,bar")).toEqual([...DEFAULT_RETRY_LADDER]);
	});

	it("drops negative and zero entries", () => {
		expect(parseRetrySchedule("10,-5,0,30")).toEqual([10, 30]);
	});

	it("caps individual delays at 24h (86400s) to protect pg-boss", () => {
		expect(parseRetrySchedule("10,999999")).toEqual([10, 86400]);
	});
});
