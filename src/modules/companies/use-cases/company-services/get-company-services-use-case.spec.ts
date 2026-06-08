import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { InMemoryServicesRepository } from "@/modules/companies/repositories/in-memory/in-memory-services-repository.js";
import { InMemoryWasteCategoriesRepository } from "@/modules/wastes/repositories/in-memory/in-memory-waste-categories-repository.js";
import { GetCompanyServicesUseCase } from "./get-company-services-use-case.js";
import { UpsertCompanyServicesUseCase } from "./upsert-company-services-use-case.js";

const CATEGORY_ID = randomUUID();

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

describe("get-company-services-use-case", () => {
	it("returns the company services list", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const servicesRepository = new InMemoryServicesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const wasteCategoriesRepository = new InMemoryWasteCategoriesRepository();
		wasteCategoriesRepository.items = [
			{
				id: CATEGORY_ID,
				name: "Papel / Papelão",
				description: null,
				observations: null,
				hazard_levels: ["LOW"],
				created_at: new Date(),
				updated_at: new Date(),
				subcategories: [],
			},
		];
		const upsertUseCase = new UpsertCompanyServicesUseCase(
			companiesRepository,
			servicesRepository,
			validationRepository,
			wasteCategoriesRepository,
		);
		const sut = new GetCompanyServicesUseCase(
			companiesRepository,
			servicesRepository,
		);

		const company = await companiesRepository.create(baseCompany);
		await validationRepository.create(company.id, true);

		await upsertUseCase.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: company.id,
			data: [
				{
					name: "Collection",
					description: "Waste collection",
					price: 250,
					unit: "UNIT",
					waste_category_id: CATEGORY_ID,
					quantity: 2,
					observations: "Includes transport",
				},
			],
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: company.id,
		});

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Collection");
		expect(result[0].quantity).toBe(2);
		expect(result[0].waste_category_id).toBe(CATEGORY_ID);
	});

	it("returns an empty array when the company has no services", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const servicesRepository = new InMemoryServicesRepository();
		const sut = new GetCompanyServicesUseCase(
			companiesRepository,
			servicesRepository,
		);

		const company = await companiesRepository.create(baseCompany);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: company.id,
		});

		expect(result).toStrictEqual([]);
	});

	it("throws when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const servicesRepository = new InMemoryServicesRepository();
		const sut = new GetCompanyServicesUseCase(
			companiesRepository,
			servicesRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				companyId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
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
