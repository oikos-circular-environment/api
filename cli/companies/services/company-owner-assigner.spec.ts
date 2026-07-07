import { describe, expect, it } from "vitest";
import type { UserSeed } from "../../shared/entities/user-seed.js";
import type { CompanySeed } from "../entities/company-seed.js";
import {
	CompanyOwnerAssigner,
	MAX_COMPANIES_PER_USER,
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
	};
}

function makeUser(id: string): UserSeed {
	return {
		full_name: `Usuário ${id}`,
		display_name: id,
		phone: "(65) 91234-5678",
		email: `${id}@oikos.seed`,
		address: makeCompany(id).address,
		companies: [],
		complaints: [],
	};
}

function flatten(ownedByUser: Map<number, CompanySeed[]>): CompanySeed[] {
	return Array.from(ownedByUser.values()).flat();
}

describe("company-owner-assigner", () => {
	it("assigns every company to a valid user index", () => {
		const companies = [makeCompany("1"), makeCompany("2"), makeCompany("3")];
		const users = [makeUser("a"), makeUser("b")];

		const result = new CompanyOwnerAssigner().assign(companies, users);

		expect(flatten(result)).toHaveLength(3);
		for (const userIndex of result.keys()) {
			expect(userIndex).toBeGreaterThanOrEqual(0);
			expect(userIndex).toBeLessThan(users.length);
		}
	});

	it("never assigns more than MAX_COMPANIES_PER_USER companies to the same user", () => {
		const companies = Array.from({ length: 10 }, (_, i) =>
			makeCompany(String(i)),
		);
		const users = Array.from({ length: 5 }, (_, i) => makeUser(`u${i}`));

		const result = new CompanyOwnerAssigner().assign(companies, users);

		for (const companiesForUser of result.values()) {
			expect(companiesForUser.length).toBeLessThanOrEqual(
				MAX_COMPANIES_PER_USER,
			);
		}
	});

	it("throws when the user pool is too small for the number of companies", () => {
		const companies = Array.from({ length: 5 }, (_, i) =>
			makeCompany(String(i)),
		);
		const users = [makeUser("a")]; // capacidade máxima: 2

		expect(() => new CompanyOwnerAssigner().assign(companies, users)).toThrow();
	});

	it("does not mutate the input companies", () => {
		const companies = [makeCompany("1")];
		const users = [makeUser("a")];

		const original = { ...companies[0] };
		new CompanyOwnerAssigner().assign(companies, users);

		expect(companies[0]).toStrictEqual(original);
	});
});
