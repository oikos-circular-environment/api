import { describe, expect, it } from "vitest";
import type { CityResidentSeed } from "../../shared/entities/city-resident.js";
import type { CompanySeed } from "../entities/company-seed.js";
import {
	CompanyOwnerAssigner,
	MAX_COMPANIES_PER_RESIDENT,
} from "./company-owner-assigner.js";

function makeCompany(id: string): CompanySeed {
	return {
		_source: {
			google_place_id: null,
			rating: null,
			types: [],
			is_ecoponto: false,
			synthetic: true,
		},
		corporate_name: `Empresa ${id}`,
		business_name: `Empresa ${id}`,
		identity: id,
		identity_type: "CNPJ",
		company_type: "COMPANY",
		status: true,
		email: null,
		phones: [],
		website: null,
		started_activity_in: new Date().toISOString(),
		address: {
			zip_code: "78000-000",
			street: "Rua A",
			number: "1",
			complement: null,
			district: "Centro",
			city: "Sinop",
			city_ibge_id: 5107909,
			state: "Mato Grosso",
			state_ibge_id: 51,
			state_code: "MT",
			latitude: 0,
			longitude: 0,
		},
		business_hours: [],
		wastes: [],
		services: [],
		owner_resident_index: -1,
	};
}

function makeResident(id: string): CityResidentSeed {
	return {
		full_name: `Morador ${id}`,
		display_name: id,
		phone: "(65) 91234-5678",
		email: `${id}@oikos.seed`,
		address: makeCompany(id).address,
	};
}

describe("company-owner-assigner", () => {
	it("assigns an owner_resident_index to every company", () => {
		const companies = [makeCompany("1"), makeCompany("2"), makeCompany("3")];
		const residents = [makeResident("a"), makeResident("b")];

		const result = new CompanyOwnerAssigner().assign(companies, residents);

		expect(result).toHaveLength(3);
		for (const company of result) {
			expect(company.owner_resident_index).toBeGreaterThanOrEqual(0);
			expect(company.owner_resident_index).toBeLessThan(residents.length);
		}
	});

	it("never assigns more than MAX_COMPANIES_PER_RESIDENT companies to the same resident", () => {
		const companies = Array.from({ length: 10 }, (_, i) =>
			makeCompany(String(i)),
		);
		const residents = Array.from({ length: 5 }, (_, i) => makeResident(`r${i}`));

		const result = new CompanyOwnerAssigner().assign(companies, residents);

		const counts = new Map<number, number>();
		for (const company of result) {
			counts.set(
				company.owner_resident_index,
				(counts.get(company.owner_resident_index) ?? 0) + 1,
			);
		}
		for (const count of counts.values()) {
			expect(count).toBeLessThanOrEqual(MAX_COMPANIES_PER_RESIDENT);
		}
	});

	it("throws when the resident pool is too small for the number of companies", () => {
		const companies = Array.from({ length: 5 }, (_, i) => makeCompany(String(i)));
		const residents = [makeResident("a")]; // capacidade máxima: 2

		expect(() =>
			new CompanyOwnerAssigner().assign(companies, residents),
		).toThrow();
	});

	it("does not mutate the input companies array", () => {
		const companies = [makeCompany("1")];
		const residents = [makeResident("a")];

		new CompanyOwnerAssigner().assign(companies, residents);

		expect(companies[0].owner_resident_index).toBe(-1);
	});
});
