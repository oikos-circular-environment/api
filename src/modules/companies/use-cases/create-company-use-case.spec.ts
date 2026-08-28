import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { makeCompany } from "@/modules/companies/factories/make-company.js";
import { FakeOrganizationProvider } from "@/modules/companies/providers/fake-organization-provider.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { CreateCompanyUseCase } from "./create-company-use-case.js";

describe("create-company-use-case", () => {
	it("creates a company for the user", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const organizationProvider = new FakeOrganizationProvider();
		const sut = new CreateCompanyUseCase(
			companiesRepository,
			validationRepository,
			organizationProvider,
		);

		const input = makeCompany({ user_id: userId });

		const result = await sut.execute({ userId, data: input });

		expect(result.user_id).toBe(userId);
		expect(result.identity).toBe(input.identity);
		expect(result.identity_type).toBe(input.identity_type);
		expect(result.company_type).toBe(input.company_type);
		expect(result.status).toBe(true);
		expect(result.business_name).toBe(input.business_name);
		expect(result.corporate_name).toBe(input.corporate_name);
		expect(result.email).toBe(input.email);
		expect(result.phones).toStrictEqual(input.phones);
		expect(result.id.length > 0).toBe(true);
	});

	it("allows the same user to create multiple companies with different identities", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const organizationProvider = new FakeOrganizationProvider();
		const sut = new CreateCompanyUseCase(
			companiesRepository,
			validationRepository,
			organizationProvider,
		);

		const input1 = makeCompany({ user_id: userId });
		const input2 = makeCompany({
			user_id: userId,
			identity_type: "CNPJ",
			company_type: "ONG",
		});

		await sut.execute({ userId, data: input1 });
		await sut.execute({ userId, data: input2 });

		expect(companiesRepository.items.length).toBe(2);
		expect(companiesRepository.items.every((c) => c.user_id === userId)).toBe(
			true,
		);
	});

	it("creates CompanyValidation with general_registration true and others false", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const organizationProvider = new FakeOrganizationProvider();
		const sut = new CreateCompanyUseCase(
			companiesRepository,
			validationRepository,
			organizationProvider,
		);

		const company = await sut.execute({
			userId,
			data: makeCompany({ user_id: userId }),
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
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const organizationProvider = new FakeOrganizationProvider();
		const sut = new CreateCompanyUseCase(
			companiesRepository,
			validationRepository,
			organizationProvider,
		);

		const company = await sut.execute({
			userId,
			data: makeCompany({ user_id: userId }),
		});

		expect(company.is_company_valid).toBe(false);
	});
});
