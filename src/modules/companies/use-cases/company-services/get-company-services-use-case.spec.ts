import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { InMemoryServicesRepository } from "@/modules/companies/repositories/in-memory/in-memory-services-repository.js";
import { makeWasteCategory } from "@/modules/wastes/factories/make-waste-category.js";
import { InMemoryWasteCategoriesRepository } from "@/modules/wastes/repositories/in-memory/in-memory-waste-categories-repository.js";
import { GetCompanyServicesUseCase } from "./get-company-services-use-case.js";
import { UpsertCompanyServicesUseCase } from "./upsert-company-services-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";

describe("get-company-services-use-case", () => {
	it("returns the company services list", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const servicesRepository = new InMemoryServicesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const wasteCategoriesRepository = new InMemoryWasteCategoriesRepository();

		const CATEGORY_ID = randomUUID();
		const category = makeWasteCategory({ id: CATEGORY_ID });
		wasteCategoriesRepository.items = [category];

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

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);
		await validationRepository.create(company.id, true);

		await upsertUseCase.execute({
			userId: USER_ID,
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
			userId: USER_ID,
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

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);

		const result = await sut.execute({
			userId: USER_ID,
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
				userId: USER_ID,
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
