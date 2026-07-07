import { describe, expect, it } from "vitest";
import { calculateWeights, VoteGenerator } from "./vote-generator.js";

const RESIDENT_POOL_SIZE = 20;
const AUTHOR_INDEX = 3;

describe("vote-generator", () => {
	it("RESOLVED always reaches the real quorum threshold (positive >= 5 + negative)", () => {
		const generator = new VoteGenerator();

		for (let i = 0; i < 50; i++) {
			const votes = generator.generate("RESOLVED", RESIDENT_POOL_SIZE, AUTHOR_INDEX);
			const { positive, negative } = calculateWeights(votes);
			expect(positive).toBeGreaterThanOrEqual(5 + negative);
		}
	});

	it("OPEN never reaches the real quorum threshold", () => {
		const generator = new VoteGenerator();

		for (let i = 0; i < 50; i++) {
			const votes = generator.generate("OPEN", RESIDENT_POOL_SIZE, AUTHOR_INDEX);
			const { positive, negative } = calculateWeights(votes);
			expect(positive).toBeLessThan(5 + negative);
		}
	});

	it("never includes the author among the voters", () => {
		const generator = new VoteGenerator();

		for (const status of ["OPEN", "RESOLVED", "CANCELED"] as const) {
			for (let i = 0; i < 50; i++) {
				const votes = generator.generate(status, RESIDENT_POOL_SIZE, AUTHOR_INDEX);
				expect(votes.some((v) => v.resident_index === AUTHOR_INDEX)).toBe(false);
			}
		}
	});

	it("never repeats a voter within the same complaint", () => {
		const generator = new VoteGenerator();

		for (const status of ["OPEN", "RESOLVED", "CANCELED"] as const) {
			for (let i = 0; i < 50; i++) {
				const votes = generator.generate(status, RESIDENT_POOL_SIZE, AUTHOR_INDEX);
				const residentIndexes = votes.map((v) => v.resident_index);
				expect(new Set(residentIndexes).size).toBe(residentIndexes.length);
			}
		}
	});

	it("CANCELED generates between 0 and 3 votes without quorum constraints", () => {
		const generator = new VoteGenerator();

		for (let i = 0; i < 50; i++) {
			const votes = generator.generate("CANCELED", RESIDENT_POOL_SIZE, AUTHOR_INDEX);
			expect(votes.length).toBeGreaterThanOrEqual(0);
			expect(votes.length).toBeLessThanOrEqual(3);
		}
	});
});
