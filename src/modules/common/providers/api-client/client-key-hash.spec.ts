import { describe, expect, it } from "vitest";
import { hashClientKey, hashesMatch } from "./client-key-hash.js";

describe("client-key-hash", () => {
	it("produces the same hash for the same raw key", () => {
		const rawKey = "some-raw-key-value";

		expect(hashClientKey(rawKey)).toBe(hashClientKey(rawKey));
	});

	it("produces different hashes for different raw keys", () => {
		expect(hashClientKey("key-a")).not.toBe(hashClientKey("key-b"));
	});

	it("matches two equal hashes", () => {
		const hash = hashClientKey("some-raw-key-value");

		expect(hashesMatch(hash, hash)).toBe(true);
	});

	it("does not match two different hashes", () => {
		const hashA = hashClientKey("key-a");
		const hashB = hashClientKey("key-b");

		expect(hashesMatch(hashA, hashB)).toBe(false);
	});

	it("does not match hashes of different length", () => {
		const hash = hashClientKey("some-raw-key-value");

		expect(hashesMatch(hash, `${hash}ff`)).toBe(false);
	});
});
