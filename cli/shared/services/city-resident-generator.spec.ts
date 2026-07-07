import { describe, expect, it } from "vitest";
import type { CityContext } from "../entities/city-context.js";
import {
	CityResidentGenerator,
	computeResidentPoolSize,
	MIN_RESIDENTS_PER_CITY,
} from "./city-resident-generator.js";

function makeCtx(): CityContext {
	return {
		city: "Sinop",
		cityIbgeId: 5107909,
		state: "Mato Grosso",
		stateIbgeId: 51,
		stateCode: "MT",
		bounds: {
			low: { latitude: -11.95, longitude: -55.6 },
			high: { latitude: -11.75, longitude: -55.4 },
		},
		center: { latitude: -11.86, longitude: -55.5 },
	};
}

describe("city-resident-generator", () => {
	it("generates exactly the requested number of residents", () => {
		const residents = new CityResidentGenerator().generate(makeCtx(), 15);

		expect(residents).toHaveLength(15);
	});

	it("generates unique emails within the same pool", () => {
		const residents = new CityResidentGenerator().generate(makeCtx(), 30);

		const emails = new Set(residents.map((r) => r.email));
		expect(emails.size).toBe(30);
	});

	it("keeps every generated address within the city bounds", () => {
		const ctx = makeCtx();
		const residents = new CityResidentGenerator().generate(ctx, 20);

		for (const resident of residents) {
			expect(resident.address.latitude).toBeGreaterThanOrEqual(
				ctx.bounds.low.latitude,
			);
			expect(resident.address.latitude).toBeLessThanOrEqual(
				ctx.bounds.high.latitude,
			);
			expect(resident.address.longitude).toBeGreaterThanOrEqual(
				ctx.bounds.low.longitude,
			);
			expect(resident.address.longitude).toBeLessThanOrEqual(
				ctx.bounds.high.longitude,
			);
			expect(resident.address.city).toBe(ctx.city);
			expect(resident.address.state_code).toBe(ctx.stateCode);
		}
	});

	describe("computeResidentPoolSize", () => {
		it("returns the minimum floor when no targets are given", () => {
			expect(computeResidentPoolSize({})).toBe(MIN_RESIDENTS_PER_CITY);
		});

		it("sizes for at most 2 companies per resident", () => {
			expect(computeResidentPoolSize({ companiesTarget: 40 })).toBe(20);
		});

		it("sizes for complaints reuse ratio", () => {
			expect(computeResidentPoolSize({ complaintsTarget: 100 })).toBe(60);
		});

		it("takes the largest requirement among companies, complaints and the explicit floor", () => {
			expect(
				computeResidentPoolSize({
					companiesTarget: 10,
					complaintsTarget: 100,
					residentsFloor: 3,
				}),
			).toBe(60);

			expect(
				computeResidentPoolSize({
					companiesTarget: 10,
					residentsFloor: 50,
				}),
			).toBe(50);
		});

		it("never goes below the explicit floor even if lower than computed needs", () => {
			expect(
				computeResidentPoolSize({ companiesTarget: 2, residentsFloor: 1 }),
			).toBe(MIN_RESIDENTS_PER_CITY);
		});
	});
});
