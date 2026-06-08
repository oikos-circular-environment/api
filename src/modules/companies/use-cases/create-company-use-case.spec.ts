import { describe, expect, it } from "vitest";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { CreateCompanyUseCase } from "./create-company-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";

describe("create-company-use-case", () => {
	it("creates a company for the user", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new CreateCompanyUseCase(
			companiesRepository,
			validationRepository,
		);

		const input = makeCompanyInput({ user_id: USER_ID });

		const result = await sut.execute({ userId: USER_ID, data: input });

		expect(result.user_id).toBe(USER_ID);
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
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new CreateCompanyUseCase(
			companiesRepository,
			validationRepository,
		);

		const input1 = makeCompanyInput({ user_id: USER_ID });
		const input2 = makeCompanyInput({
			user_id: USER_ID,
			identity_type: "CNPJ",
			company_type: "ONG",
		});

		await sut.execute({ userId: USER_ID, data: input1 });
		await sut.execute({ userId: USER_ID, data: input2 });

		expect(companiesRepository.items.length).toBe(2);
		expect(companiesRepository.items.every((c) => c.user_id === USER_ID)).toBe(
			true,
		);
	});

	it("creates CompanyValidation with general_registration true and others false", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new CreateCompanyUseCase(
			companiesRepository,
			validationRepository,
		);

		const company = await sut.execute({
			userId: USER_ID,
			data: makeCompanyInput({ user_id: USER_ID }),
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
		const sut = new CreateCompanyUseCase(
			companiesRepository,
			validationRepository,
		);

		const company = await sut.execute({
			userId: USER_ID,
			data: makeCompanyInput({ user_id: USER_ID }),
		});

		expect(company.is_company_valid).toBe(false);
	});
});
