import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompany } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { GetCompanyValidationUseCase } from "./get-company-validation-use-case.js";

describe("get-company-validation-use-case", () => {
	it("returns validation when company exists and has one", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new GetCompanyValidationUseCase(
			companiesRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		const result = await sut.execute({ userId, companyId: company.id });

		expect(result).not.toBeNull();
		expect(result?.company_id).toBe(company.id);
		expect(result?.general_registration).toBe(true);
	});

	it("returns null when company exists but has no validation record", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new GetCompanyValidationUseCase(
			companiesRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		const result = await sut.execute({ userId, companyId: company.id });

		expect(result).toBeNull();
	});

	it("throws 404 when company does not exist", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new GetCompanyValidationUseCase(
			companiesRepository,
			validationRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({ userId, companyId: randomUUID() });
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Company not found");
			expect(thrownError.code).toBe("COMPANY_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("throws 404 when company belongs to a different user", async () => {
		const userId = randomUUID();
		const otherUserId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new GetCompanyValidationUseCase(
			companiesRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({ userId: otherUserId, companyId: company.id });
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("COMPANY_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});
});
