import { describe, expect, it } from "vitest";
import type { UnownedCompanySeed } from "../entities/company-seed.js";
import { CompanySeedRepairer } from "./company-seed-repairer.js";

function makeValidSeed(overrides?: Partial<UnownedCompanySeed>): UnownedCompanySeed {
	return {
		_source: {
			google_place_id: "place-1",
			rating: null,
			types: [],
			is_ecoponto: false,
			synthetic: false,
		},
		corporate_name: "Recicla Fácil",
		business_name: "Recicla Fácil",
		identity: "74833578000165",
		identity_type: "CNPJ",
		company_type: "COMPANY",
		status: true,
		email: "contato@reciclafacil.com",
		phones: ["(66) 99999-0000"],
		website: null,
		started_activity_in: new Date("2020-01-01").toISOString(),
		address: {
			zip_code: "78700-000",
			street: "Rua das Flores",
			number: "123",
			complement: null,
			district: "Centro",
			city: "Rondonópolis",
			city_ibge_id: 5107602,
			state: "Mato Grosso",
			state_ibge_id: 51,
			state_code: "MT",
			latitude: -16.47,
			longitude: -54.63,
		},
		business_hours: [
			{
				day_of_week: "MONDAY",
				is_open: true,
				time_slots: [{ start_time: "08:00", end_time: "18:00" }],
			},
		],
		wastes: [
			{
				name: "Plástico",
				description: null,
				price: 1,
				unit: "KG",
				waste_category_name: "Plástico",
				quantity: 10,
			},
		],
		services: [],
		...overrides,
	};
}

describe("company-seed-repairer", () => {
	const repairer = new CompanySeedRepairer();

	it("leaves an already-valid seed untouched", () => {
		const seed = makeValidSeed();

		const result = repairer.repair(seed);

		expect(result.fixes).toStrictEqual([]);
		expect(result.stillInvalid).toBe(false);
		expect(result.seed).toStrictEqual(seed);
	});

	it("fills in a missing phone", () => {
		const seed = makeValidSeed({ phones: [] });

		const result = repairer.repair(seed);

		expect(result.fixes).toContain("telefone ausente — gerado sintético");
		expect(result.stillInvalid).toBe(false);
		expect(result.seed.phones).toHaveLength(1);
		expect(result.seed.phones[0]).toMatch(/^\(\d{2}\) 9\d{4}-\d{4}$/);
	});

	it("fills in missing business hours", () => {
		const seed = makeValidSeed({ business_hours: [] });

		const result = repairer.repair(seed);

		expect(result.fixes).toContain("horário ausente — gerado sintético");
		expect(result.stillInvalid).toBe(false);
		expect(result.seed.business_hours.length).toBeGreaterThan(0);
	});

	it("fixes both phone and business hours in the same pass", () => {
		const seed = makeValidSeed({ phones: [], business_hours: [] });

		const result = repairer.repair(seed);

		expect(result.fixes).toHaveLength(2);
		expect(result.stillInvalid).toBe(false);
	});

	it("reports stillInvalid when the address itself is broken (not repairable)", () => {
		const seed = makeValidSeed({
			address: { ...makeValidSeed().address, zip_code: "" },
		});

		const result = repairer.repair(seed);

		expect(result.stillInvalid).toBe(true);
	});
});
