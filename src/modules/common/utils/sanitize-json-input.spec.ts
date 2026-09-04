import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { sanitizeJsonInput } from "./sanitize-json-input.js";

describe("sanitize-json-input", () => {
	it("returns the value unchanged when it is safe", () => {
		const value = { a: 1, b: { c: [1, 2, 3] } };
		expect(sanitizeJsonInput(value, { errorCode: "TEST_INVALID" })).toBe(value);
	});

	it("returns undefined unchanged", () => {
		expect(
			sanitizeJsonInput(undefined, { errorCode: "TEST_INVALID" }),
		).toBeUndefined();
	});

	it("rejects __proto__ key at the top level", () => {
		const value = JSON.parse('{"__proto__": {"polluted": true}}');
		expect(() =>
			sanitizeJsonInput(value, { errorCode: "TEST_INVALID" }),
		).toThrow(AppError);
	});

	it("rejects constructor key nested inside an object", () => {
		const value = { nested: { constructor: { polluted: true } } };
		expect(() =>
			sanitizeJsonInput(value, { errorCode: "TEST_INVALID" }),
		).toThrow(AppError);
	});

	it("rejects prototype key inside an array item", () => {
		const value = { items: [{ prototype: {} }] };
		expect(() =>
			sanitizeJsonInput(value, { errorCode: "TEST_INVALID" }),
		).toThrow(AppError);
	});

	it("rejects payload deeper than maxDepth", () => {
		const value = { a: { b: { c: { d: { e: { f: 1 } } } } } };
		expect(() =>
			sanitizeJsonInput(value, { errorCode: "TEST_INVALID", maxDepth: 3 }),
		).toThrow(AppError);
	});

	it("rejects payload larger than maxBytes", () => {
		const value = { text: "x".repeat(100) };
		expect(() =>
			sanitizeJsonInput(value, { errorCode: "TEST_INVALID", maxBytes: 10 }),
		).toThrow(AppError);
	});

	it("rejects payload exceeding maxBytes in UTF-8 even when under the UTF-16 char count", () => {
		const value = { text: "á".repeat(20) };
		expect(JSON.stringify(value).length).toBeLessThanOrEqual(40);
		expect(() =>
			sanitizeJsonInput(value, { errorCode: "TEST_INVALID", maxBytes: 40 }),
		).toThrow(AppError);
	});

	it("throws AppError with the given error code", () => {
		try {
			sanitizeJsonInput(JSON.parse('{"__proto__": {"polluted": true}}'), {
				errorCode: "CUSTOM_CODE",
			});
			throw new Error("expected sanitizeJsonInput to throw");
		} catch (error) {
			expect(error instanceof AppError).toBe(true);
			if (error instanceof AppError) {
				expect(error.code).toBe("CUSTOM_CODE");
				expect(error.statusCode).toBe(400);
			}
		}
	});
});
