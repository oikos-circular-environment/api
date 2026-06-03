import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { ToggleCompanyStatusUseCase } from "./toggle-company-status-use-case.js";

const baseCompany = {
	user_id: "11111111-1111-1111-1111-111111111111",
	identity: "12345678900",
	identity_type: "CPF" as const,
	company_type: "COMPANY" as const,
	status: true,
	business_name: "Oikos Tech",
	corporate_name: "Oikos Tech LTDA",
	email: "contato@oikos.dev",
	phones: ["5511999999999"],
	started_activity_in: new Date("2024-01-01T00:00:00.000Z"),
};

describe("toggle-company-status-use-case", () => {
	it("deactivates an active company", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		const created = await companiesRepository.create(baseCompany);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: created.id,
			status: false,
		});

		expect(result.status).toBe(false);
		expect(result.id).toBe(created.id);
	});

	it("activates an inactive company", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new ToggleCompanyStatusUseCase(companiesRepository);

		const created = await companiesRepository.create({
			...baseCompany,
			status: false,
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
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
				userId: "11111111-1111-1111-1111-111111111111",
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

		const created = await companiesRepository.create(baseCompany);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "22222222-2222-2222-2222-222222222222",
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

		const created = await companiesRepository.create(baseCompany);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: created.id,
			status: false,
		});

		expect(result.business_name).toBe("Oikos Tech");
		expect(result.identity).toBe("12345678900");
		expect(result.phones).toStrictEqual(["5511999999999"]);
	});
});
