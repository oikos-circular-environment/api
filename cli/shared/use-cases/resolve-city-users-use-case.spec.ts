import { describe, expect, it } from "vitest";
import type { CityContext } from "../entities/city-context.js";
import type { UserSeed } from "../entities/user-seed.js";
import { UserGenerator } from "../services/user-generator.js";
import { ResolveCityUsersUseCase } from "./resolve-city-users-use-case.js";

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

class CountingUserGenerator extends UserGenerator {
	calls = 0;

	override generate(ctx: CityContext, count: number): UserSeed[] {
		this.calls++;
		return super.generate(ctx, count);
	}
}

describe("resolve-city-users-use-case", () => {
	it("generates a pool sized by computeUserPoolSize", () => {
		const useCase = new ResolveCityUsersUseCase();

		const users = useCase.execute(makeCtx(), { companiesTarget: 20 });

		expect(users).toHaveLength(10); // ceil(20/2) = 10, abaixo do piso mínimo de 10 -> 10
	});

	it("generates a fresh pool on every call — no caching", () => {
		const generator = new CountingUserGenerator();
		const useCase = new ResolveCityUsersUseCase(generator);
		const ctx = makeCtx();

		useCase.execute(ctx, { companiesTarget: 20 });
		useCase.execute(ctx, { companiesTarget: 20 });

		expect(generator.calls).toBe(2);
	});
});
