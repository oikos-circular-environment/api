import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { ToggleCompanyStatusUseCase } from "./toggle-company-status-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const ANOTHER_USER_ID = "22222222-2222-2222-2222-222222222222";

describe("toggle-company-status-use-case", () => {
	it("deactivates an active company", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		const created = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID, status: true }),
		);

		const result = await sut.execute({
			userId: USER_ID,
			companyId: created.id,
			status: false,
		});

		expect(result.status).toBe(false);
		expect(result.id).toBe(created.id);
	});

	it("activates an inactive company", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		const created = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID, status: false }),
		);

		const result = await sut.execute({
			userId: USER_ID,
			companyId: created.id,
			status: true,
		});

		expect(result.status).toBe(true);
	});

	it("throws when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: USER_ID,
				companyId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
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
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		const created = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: ANOTHER_USER_ID,
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
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		const input = makeCompanyInput({ user_id: USER_ID });
		const created = await companiesRepository.create(input);

		const result = await sut.execute({
			userId: USER_ID,
			companyId: created.id,
			status: false,
		});

		expect(result.business_name).toBe(created.business_name);
		expect(result.identity).toBe(created.identity);
		expect(result.phones).toStrictEqual(created.phones);
	});
});
