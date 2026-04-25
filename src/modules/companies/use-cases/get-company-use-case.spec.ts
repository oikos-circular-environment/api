import { describe, expect, it } from "vitest";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { GetCompanyUseCase } from "./get-company-use-case.js";

describe("get-company-use-case", () => {
	it("returns company when it exists", async () => {
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
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result?.user_id).toBe("11111111-1111-1111-1111-111111111111");
		expect(result?.identity).toBe("12345678900");
		expect(result?.corporate_name).toBe("Oikos Tech LTDA");
	});

	it("returns null when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new GetCompanyUseCase(companiesRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toBe(null);
	});
});
