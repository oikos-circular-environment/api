import { describe, expect, it } from "vitest";
import type { CityContext } from "../entities/city-context.js";
import {
	computeUserPoolSize,
	MIN_USERS_PER_CITY,
	UserGenerator,
} from "./user-generator.js";

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

describe("user-generator", () => {
	it("generates exactly the requested number of users", () => {
		const users = new UserGenerator().generate(makeCtx(), 15);

		expect(users).toHaveLength(15);
	});

	it("generates unique emails within the same pool", () => {
		const users = new UserGenerator().generate(makeCtx(), 30);

		const emails = new Set(users.map((u) => u.email));
		expect(emails.size).toBe(30);
	});

	it("starts every user with empty companies and complaints", () => {
		const users = new UserGenerator().generate(makeCtx(), 5);

		for (const user of users) {
			expect(user.companies).toEqual([]);
			expect(user.complaints).toEqual([]);
		}
	});

	it("keeps every generated address within the city bounds", () => {
		const ctx = makeCtx();
		const users = new UserGenerator().generate(ctx, 20);

		for (const user of users) {
			expect(user.address.latitude).toBeGreaterThanOrEqual(
				ctx.bounds.low.latitude,
			);
			expect(user.address.latitude).toBeLessThanOrEqual(
				ctx.bounds.high.latitude,
			);
			expect(user.address.longitude).toBeGreaterThanOrEqual(
				ctx.bounds.low.longitude,
			);
			expect(user.address.longitude).toBeLessThanOrEqual(
				ctx.bounds.high.longitude,
			);
			expect(user.address.city).toBe(ctx.city);
			expect(user.address.state_code).toBe(ctx.stateCode);
		}
	});

	describe("computeUserPoolSize", () => {
		it("returns the minimum floor when no targets are given", () => {
			expect(computeUserPoolSize({})).toBe(MIN_USERS_PER_CITY);
		});

		it("sizes for at most 2 companies per user", () => {
			expect(computeUserPoolSize({ companiesTarget: 40 })).toBe(20);
		});

		it("sizes for complaints reuse ratio", () => {
			expect(computeUserPoolSize({ complaintsTarget: 100 })).toBe(60);
		});

		it("takes the largest requirement among companies, complaints and the explicit floor", () => {
			expect(
				computeUserPoolSize({
					companiesTarget: 10,
					complaintsTarget: 100,
					usersFloor: 3,
				}),
			).toBe(60);

			expect(
				computeUserPoolSize({
					companiesTarget: 10,
					usersFloor: 50,
				}),
			).toBe(50);
		});

		it("never goes below the explicit floor even if lower than computed needs", () => {
			expect(computeUserPoolSize({ companiesTarget: 2, usersFloor: 1 })).toBe(
				MIN_USERS_PER_CITY,
			);
		});
	});
});
