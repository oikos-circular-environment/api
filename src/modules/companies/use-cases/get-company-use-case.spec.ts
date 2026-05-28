import { describe, expect, it } from "vitest";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { GetCompanyUseCase } from "./get-company-use-case.js";

describe("get-company-use-case", () => {
	it("returns all companies for a user", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new GetCompanyUseCase(companiesRepository);

		await companiesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			identity: "12345678900",
			identity_type: "CPF",
			company_type: "COMPANY",
			status: true,
			is_headquarters: true,
			business_name: "Oikos Tech",
			corporate_name: "Oikos Tech LTDA",
			accept_appointments: true,
			email: "contato@oikos.dev",
			phones: ["5511999999999"],
			started_activity_in: new Date("2024-01-01T00:00:00.000Z"),
			description: null,
		});

		await companiesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			identity: "99888777000166",
			identity_type: "CNPJ",
			company_type: "ONG",
			status: true,
			is_headquarters: false,
			business_name: null,
			corporate_name: "Nova Oikos SA",
			accept_appointments: false,
			email: null,
			phones: ["5511777777777"],
			started_activity_in: new Date("2025-01-01T00:00:00.000Z"),
			description: null,
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBe(2);
		expect(result[0].user_id).toBe("11111111-1111-1111-1111-111111111111");
		expect(result[1].corporate_name).toBe("Nova Oikos SA");
	});

	it("returns empty array when user has no companies", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new GetCompanyUseCase(companiesRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBe(0);
	});
});
