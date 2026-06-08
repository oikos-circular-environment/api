import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompany } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { ToggleCompanyStatusUseCase } from "./toggle-company-status-use-case.js";

describe("toggle-company-status-use-case", () => {
	it("deactivates an active company", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		const created = await companiesRepository.create(
			makeCompany({ user_id: userId, status: true }),
		);

		const result = await sut.execute({
			userId,
			companyId: created.id,
			status: false,
		});

		expect(result.status).toBe(false);
		expect(result.id).toBe(created.id);
	});

	it("activates an inactive company", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		const created = await companiesRepository.create(
			makeCompany({ user_id: userId, status: false }),
		);

		const result = await sut.execute({
			userId,
			companyId: created.id,
			status: true,
		});

		expect(result.status).toBe(true);
	});

	it("throws when company does not exist", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: randomUUID(),
				status: false,
			});
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

	it("throws when company belongs to a different user", async () => {
		const userId = randomUUID();
		const anotherUserId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		const created = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: anotherUserId,
				companyId: created.id,
				status: false,
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("COMPANY_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});

	it("does not change other company fields when toggling status", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		const input = makeCompany({ user_id: userId });
		const created = await companiesRepository.create(input);

		const result = await sut.execute({
			userId,
			companyId: created.id,
			status: false,
		});

		expect(result.business_name).toBe(created.business_name);
		expect(result.identity).toBe(created.identity);
		expect(result.phones).toStrictEqual(created.phones);
	});
});
