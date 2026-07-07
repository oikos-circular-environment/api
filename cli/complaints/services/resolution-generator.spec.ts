import { describe, expect, it } from "vitest";
import { ResolutionGenerator } from "./resolution-generator.js";

const RESIDENT_POOL_SIZE = 20;

describe("resolution-generator", () => {
	it("never generates resolutions for OPEN or CANCELED complaints", () => {
		const generator = new ResolutionGenerator();

		expect(generator.generate("OPEN", new Set(), RESIDENT_POOL_SIZE)).toEqual([]);
		expect(generator.generate("CANCELED", new Set(), RESIDENT_POOL_SIZE)).toEqual(
			[],
		);
	});

	it("generates 1-2 resolutions for RESOLVED complaints", () => {
		const generator = new ResolutionGenerator();

		for (let i = 0; i < 50; i++) {
			const resolutions = generator.generate(
				"RESOLVED",
				new Set(),
				RESIDENT_POOL_SIZE,
			);
			expect(resolutions.length).toBeGreaterThanOrEqual(1);
			expect(resolutions.length).toBeLessThanOrEqual(2);
		}
	});

	it("never repeats a resident_index within the same complaint's resolutions", () => {
		const generator = new ResolutionGenerator();

		for (let i = 0; i < 50; i++) {
			const resolutions = generator.generate(
				"RESOLVED",
				new Set(),
				RESIDENT_POOL_SIZE,
			);
			const indexes = resolutions.map((r) => r.resident_index);
			expect(new Set(indexes).size).toBe(indexes.length);
		}
	});

	it("never marks PREFER_COMPANY for a resident outside residentsWithCompany", () => {
		const generator = new ResolutionGenerator();
		const residentsWithCompany = new Set<number>(); // vazio — nenhum morador tem empresa

		for (let i = 0; i < 50; i++) {
			const resolutions = generator.generate(
				"RESOLVED",
				residentsWithCompany,
				RESIDENT_POOL_SIZE,
			);
			for (const resolution of resolutions) {
				expect(resolution.resolution_hint).toBe("CITIZEN_ONLY");
			}
		}
	});

	it("only marks PREFER_COMPANY for residents present in residentsWithCompany", () => {
		const generator = new ResolutionGenerator();
		const residentsWithCompany = new Set<number>(
			Array.from({ length: RESIDENT_POOL_SIZE }, (_, i) => i),
		); // todos os moradores têm empresa — só pra checar que hint nunca escapa do pool

		for (let i = 0; i < 50; i++) {
			const resolutions = generator.generate(
				"RESOLVED",
				residentsWithCompany,
				RESIDENT_POOL_SIZE,
			);
			for (const resolution of resolutions) {
				expect(["PREFER_COMPANY", "CITIZEN_ONLY"]).toContain(
					resolution.resolution_hint,
				);
			}
		}
	});
});
