import { describe, expect, it } from "vitest";
import {
	companyGeneralRegistrationValidationSchema,
	measurementSchema,
	upsertCompanyAddressSchema,
	upsertCompanyBusinessHoursSchema,
} from "../../../src/modules/companies/dtos/companies-dto.js";
import type { CityContext } from "../../shared/entities/city-context.js";
import type { CompanySeed } from "../entities/company-seed.js";
import type { GooglePlace } from "../entities/google-place.js";
import { GoogleAddressParser } from "./address-parser.js";
import { CompanyGapFiller } from "./company-gap-filler.js";
import { CompanySeedMapper } from "./company-seed-mapper.js";
import { CompanyTypeClassifier } from "./company-type-classifier.js";
import { BrazilianIdentityGenerator } from "./identity-generator.js";
import { WasteServiceGenerator } from "./waste-service-generator.js";

function makeCtx(): CityContext {
	return {
		city: "Rondonópolis",
		cityIbgeId: 5107602,
		state: "Mato Grosso",
		stateIbgeId: 51,
		stateCode: "MT",
		bounds: {
			low: { latitude: -16.72, longitude: -54.78 },
			high: { latitude: -16.22, longitude: -54.35 },
		},
		center: { latitude: -16.47, longitude: -54.63 },
	};
}

function makeMapper(): CompanySeedMapper {
	return new CompanySeedMapper(
		new GoogleAddressParser(),
		new CompanyTypeClassifier(),
		new CompanyGapFiller(),
		new WasteServiceGenerator(),
		new BrazilianIdentityGenerator(),
	);
}

/**
 * companyAddressSchema/companyBusinessHoursValidationSchema/
 * companyWastesValidationSchema exigem id/timestamps/waste_category_id (uuid)
 * pós-persistência que o seed pré-inserção nunca tem — por isso usamos os
 * schemas de criação (upsertCompanyAddressSchema/upsertCompanyBusinessHoursSchema)
 * e, para wastes/services, asserts de regra de negócio diretamente.
 */
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
		expect(item.waste_category_name.length).toBeGreaterThan(0);
	}

	const wasteNames = seed.wastes.map((w) => w.name);
	expect(new Set(wasteNames).size).toBe(wasteNames.length);
	const serviceNames = seed.services.map((s) => s.name);
	expect(new Set(serviceNames).size).toBe(serviceNames.length);
}

describe("company-seed-mapper", () => {
	it("maps a fully-populated real place into a valid CompanySeed", () => {
		const place: GooglePlace = {
			id: "place-1",
			displayName: { text: "Recicla Fácil Comércio de Recicláveis LTDA" },
			formattedAddress:
				"Rua das Flores, 123 - Centro, Rondonópolis - MT, 78700-000, Brasil",
			location: { latitude: -16.47, longitude: -54.63 },
			nationalPhoneNumber: "(66) 3411-0000",
			rating: 4.5,
			businessStatus: "OPERATIONAL",
			types: ["point_of_interest"],
			regularOpeningHours: {
				periods: [
					{
						open: { day: 1, hour: 8, minute: 0 },
						close: { day: 1, hour: 18, minute: 0 },
					},
				],
			},
		};

		const seed = makeMapper().map(place, makeCtx());

		expect(seed._source.google_place_id).toBe("place-1");
		expect(seed._source.synthetic).toBe(false);
		expect(seed.phones).toStrictEqual(["(66) 3411-0000"]);
		expect(seed.company_type).toBe("COMPANY");
		expect(seed.identity_type).toBe("CNPJ");
		expect(seed.identity).toMatch(/^\d{14}$/);
		expectValidSeed(seed);
	});

	it("maps a government/ecoponto place with gaps filled synthetically", () => {
		const place: GooglePlace = {
			id: "place-2",
			displayName: { text: "Ecoponto Municipal Bairro Norte" },
			formattedAddress: "Av. Principal, 500 - Bairro Norte, Rondonópolis - MT",
		};

		const seed = makeMapper().map(place, makeCtx());

		expect(seed.company_type).toBe("GOVERNMENT");
		expect(seed._source.is_ecoponto).toBe(true);
		expect(seed.identity_type).toBe("CNPJ");
		expect(seed.email).not.toBeNull();
		expect(seed.email ?? "").not.toBe("");
		expect(seed.phones).toHaveLength(1);
		expect(seed.business_hours.length).toBeGreaterThan(0);
		expectValidSeed(seed);
	});

	it("maps an informal collector place with CPF identity", () => {
		const place: GooglePlace = {
			id: "place-3",
			displayName: { text: "Ferro Velho do Zé" },
		};

		const seed = makeMapper().map(place, makeCtx());

		expect(seed.company_type).toBe("COLLECTOR");
		expect(seed.identity_type).toBe("CPF");
		expect(seed.identity).toMatch(/^\d{11}$/);
		expectValidSeed(seed);
	});

	it("falls back to a default name when displayName is missing", () => {
		const place: GooglePlace = { id: "place-4" };

		const seed = makeMapper().map(place, makeCtx());

		expect(seed.corporate_name).toBe("Empresa de Reciclagem");
		expectValidSeed(seed);
	});
});
