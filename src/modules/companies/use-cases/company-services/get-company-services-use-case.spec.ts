import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompany } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { InMemoryServicesRepository } from "@/modules/companies/repositories/in-memory/in-memory-services-repository.js";
import { makeWasteCategory } from "@/modules/wastes/factories/make-waste-category.js";
import { InMemoryWasteCategoriesRepository } from "@/modules/wastes/repositories/in-memory/in-memory-waste-categories-repository.js";
import { GetCompanyServicesUseCase } from "./get-company-services-use-case.js";
import { UpsertCompanyServicesUseCase } from "./upsert-company-services-use-case.js";

describe("get-company-services-use-case", () => {
	it("returns the company services list", async () => {
		const userId = randomUUID();
		const categoryId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const servicesRepository = new InMemoryServicesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const wasteCategoriesRepository = new InMemoryWasteCategoriesRepository();

		const category = makeWasteCategory({ id: categoryId });
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
			makeCompany({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		await upsertUseCase.execute({
			userId,
			companyId: company.id,
			data: [
				{
					name: "Collection",
					description: "Waste collection",
					price: 250,
					unit: "UNIT",
					waste_category_id: categoryId,
					quantity: 2,
					observations: "Includes transport",
				},
			],
		});

		const result = await sut.execute({
			userId,
			companyId: company.id,
		});

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Collection");
		expect(result[0].quantity).toBe(2);
		expect(result[0].waste_category_id).toBe(categoryId);
	});

	it("returns an empty array when the company has no services", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const servicesRepository = new InMemoryServicesRepository();
		const sut = new GetCompanyServicesUseCase(
			companiesRepository,
			servicesRepository,
		);

		const company = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		const result = await sut.execute({
			userId,
			companyId: company.id,
		});

		expect(result).toStrictEqual([]);
	});

	it("throws when company does not exist", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const servicesRepository = new InMemoryServicesRepository();
		const sut = new GetCompanyServicesUseCase(
			companiesRepository,
			servicesRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: randomUUID(),
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
