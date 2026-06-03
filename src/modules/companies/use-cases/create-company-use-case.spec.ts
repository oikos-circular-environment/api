import { describe, expect, it } from "vitest";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { CreateCompanyUseCase } from "./create-company-use-case.js";

const baseData = {
	identity: "12345678900",
	identity_type: "CPF" as const,
	company_type: "COMPANY" as const,
	status: true,
	business_name: "Oikos Tech",
	corporate_name: "Oikos Tech LTDA",
	email: "contato@oikos.dev",
	phones: ["5511999999999", "5511888888888"],
	started_activity_in: new Date("2024-01-01T00:00:00.000Z"),
};

describe("create-company-use-case", () => {
	it("creates a company for the user", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new CreateCompanyUseCase(companiesRepository, validationRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: baseData,
		});

		expect(result.user_id).toBe("11111111-1111-1111-1111-111111111111");
		expect(result.identity).toBe("12345678900");
		expect(result.identity_type).toBe("CPF");
		expect(result.company_type).toBe("COMPANY");
		expect(result.status).toBe(true);
		expect(result.business_name).toBe("Oikos Tech");
		expect(result.corporate_name).toBe("Oikos Tech LTDA");
		expect(result.email).toBe("contato@oikos.dev");
		expect(result.phones).toStrictEqual(["5511999999999", "5511888888888"]);
		expect(result.id.length > 0).toBe(true);
	});

	it("allows the same user to create multiple companies with different identities", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new CreateCompanyUseCase(companiesRepository, validationRepository);

		await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: baseData,
		});

		await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				identity: "99888777000166",
				identity_type: "CNPJ",
				company_type: "ONG",
				status: true,
				business_name: "Nova Oikos",
				corporate_name: "Nova Oikos SA",
				email: "nova@oikos.dev",
				phones: ["5511777777777"],
				started_activity_in: new Date("2025-01-01T00:00:00.000Z"),
			},
		});

		expect(companiesRepository.items.length).toBe(2);
		expect(
			companiesRepository.items.every(
				(c) => c.user_id === "11111111-1111-1111-1111-111111111111",
			),
		).toBe(true);
	});

	it("creates CompanyValidation with general_registration true and others false", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new CreateCompanyUseCase(companiesRepository, validationRepository);

		const company = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: baseData,
		});

		const validation = await validationRepository.findByCompanyId(company.id);

		expect(validation).not.toBeNull();
		expect(validation?.general_registration).toBe(true);
		expect(validation?.address).toBe(false);
		expect(validation?.business_hours).toBe(false);
		expect(validation?.wastes).toBe(false);
		expect(validation?.services).toBe(false);
	});

	it("sets is_company_valid to false on a freshly created company", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new CreateCompanyUseCase(companiesRepository, validationRepository);

		const company = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: baseData,
		});

		expect(company.is_company_valid).toBe(false);
	});
});
