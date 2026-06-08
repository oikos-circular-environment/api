import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { UpdateCompanyUseCase } from "./update-company-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const ANOTHER_USER_ID = "22222222-2222-2222-2222-222222222222";

describe("update-company-use-case", () => {
	it("updates an existing company by userId and companyId", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpdateCompanyUseCase(
			companiesRepository,
			validationRepository,
		);

		const created = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);
		await validationRepository.create(created.id, true);

		const result = await sut.execute({
			userId: USER_ID,
			companyId: created.id,
			data: {
				identity: "99888777000166",
				identity_type: "CNPJ",
				company_type: "ONG",
				status: false,
				business_name: "Oikos Solidaria",
				corporate_name: "Oikos Solidaria SA",
				email: "solidaria@oikos.dev",
				phones: ["5511777777777", "5511666666666"],
			},
		});

		expect(result?.identity).toBe("99888777000166");
		expect(result?.identity_type).toBe("CNPJ");
		expect(result?.company_type).toBe("ONG");
		expect(result?.status).toBe(false);
		expect(result?.business_name).toBe("Oikos Solidaria");
		expect(result?.corporate_name).toBe("Oikos Solidaria SA");
		expect(result?.email).toBe("solidaria@oikos.dev");
		expect(result?.phones).toStrictEqual(["5511777777777", "5511666666666"]);
	});

	it("keeps general_registration true after valid update", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpdateCompanyUseCase(
			companiesRepository,
			validationRepository,
		);

		const created = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);
		await validationRepository.create(created.id, true);

		await sut.execute({
			userId: USER_ID,
			companyId: created.id,
			data: { business_name: "New Name" },
		});

		const validation = await validationRepository.findByCompanyId(created.id);

		expect(validation?.general_registration).toBe(true);
	});

	it("throws when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpdateCompanyUseCase(
			companiesRepository,
			validationRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: USER_ID,
				companyId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				data: { corporate_name: "Updated Company" },
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
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpdateCompanyUseCase(
			companiesRepository,
			validationRepository,
		);

		const created = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: ANOTHER_USER_ID,
				companyId: created.id,
				data: { corporate_name: "Hacked Company" },
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
});
