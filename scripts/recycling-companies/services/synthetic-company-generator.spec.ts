import { describe, expect, it } from "vitest";
import {
	companyGeneralRegistrationValidationSchema,
	measurementSchema,
	upsertCompanyAddressSchema,
	upsertCompanyBusinessHoursSchema,
} from "../../../src/modules/companies/dtos/companies-dto.js";
import type { CityContext } from "../entities/city-context.js";
import type { CompanySeed } from "../entities/company-seed.js";
import { BrazilianIdentityGenerator } from "./identity-generator.js";
import { SyntheticCompanyGenerator } from "./synthetic-company-generator.js";
import { WasteServiceGenerator } from "./waste-service-generator.js";

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

function expectValidSeed(seed: CompanySeed): void {
	expect(
		companyGeneralRegistrationValidationSchema.safeParse(seed).success,
	).toBe(true);
	expect(upsertCompanyAddressSchema.safeParse(seed.address).success).toBe(true);
	expect(
		upsertCompanyBusinessHoursSchema.safeParse({
			business_hours: seed.business_hours,
		}).success,
	).toBe(true);

	for (const item of [...seed.wastes, ...seed.services]) {
		expect(measurementSchema.safeParse(item.unit).success).toBe(true);
		expect(item.price).toBeGreaterThanOrEqual(0);
		expect(item.quantity).toBeGreaterThan(0);
	}
}

describe("synthetic-company-generator", () => {
	function makeGenerator(): SyntheticCompanyGenerator {
		return new SyntheticCompanyGenerator(
			new WasteServiceGenerator(),
			new BrazilianIdentityGenerator(),
		);
	}

	it("generates a fully valid synthetic CompanySeed marked as synthetic", () => {
		const seed = makeGenerator().generate(makeCtx());

		expect(seed._source.synthetic).toBe(true);
		expect(seed._source.google_place_id).toBeNull();
		expectValidSeed(seed);
	});

	it("keeps generated geo coordinates within the city bounds", () => {
		const ctx = makeCtx();
		const seed = makeGenerator().generate(ctx);

		expect(seed.address.latitude).toBeGreaterThanOrEqual(
			ctx.bounds.low.latitude,
		);
		expect(seed.address.latitude).toBeLessThanOrEqual(ctx.bounds.high.latitude);
		expect(seed.address.longitude).toBeGreaterThanOrEqual(
			ctx.bounds.low.longitude,
		);
		expect(seed.address.longitude).toBeLessThanOrEqual(
			ctx.bounds.high.longitude,
		);
	});

	it("matches identity_type to company_type (CPF only for COLLECTOR)", () => {
		const generator = makeGenerator();

		for (let i = 0; i < 50; i++) {
			const seed = generator.generate(makeCtx());
			if (seed.company_type === "COLLECTOR") {
				expect(seed.identity_type).toBe("CPF");
			} else {
				expect(seed.identity_type).toBe("CNPJ");
			}
		}
	});

	it("produces a plausible distribution across all 4 company types over many calls", () => {
		const generator = makeGenerator();
		const seen = new Set<string>();

		for (let i = 0; i < 100; i++) {
			seen.add(generator.generate(makeCtx()).company_type);
		}

		expect(seen).toEqual(
			new Set(["COMPANY", "ONG", "GOVERNMENT", "COLLECTOR"]),
		);
	});
});
