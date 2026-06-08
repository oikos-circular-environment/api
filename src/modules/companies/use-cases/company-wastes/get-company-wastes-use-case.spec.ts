import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompany } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { InMemoryWastesRepository } from "@/modules/companies/repositories/in-memory/in-memory-wastes-repository.js";
import { makeWasteCategory } from "@/modules/wastes/factories/make-waste-category.js";
import { InMemoryWasteCategoriesRepository } from "@/modules/wastes/repositories/in-memory/in-memory-waste-categories-repository.js";
import { GetCompanyWastesUseCase } from "./get-company-wastes-use-case.js";
import { UpsertCompanyWastesUseCase } from "./upsert-company-wastes-use-case.js";

describe("get-company-wastes-use-case", () => {
	it("returns the company wastes list", async () => {
		const userId = randomUUID();
		const categoryId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const wastesRepository = new InMemoryWastesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const wasteCategoriesRepository = new InMemoryWasteCategoriesRepository();

		const category = makeWasteCategory({ id: categoryId });
		wasteCategoriesRepository.items = [category];

		const upsertUseCase = new UpsertCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
			validationRepository,
			wasteCategoriesRepository,
		);
		const sut = new GetCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
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
					name: "Paper",
					description: "Paper waste",
					price: 12.5,
					unit: "KG",
					waste_category_id: categoryId,
					quantity: 100,
					observations: null,
				},
			],
		});

		const result = await sut.execute({
			userId,
			companyId: company.id,
		});

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Paper");
		expect(result[0].waste_category_id).toBe(categoryId);
	});

	it("returns an empty array when the company has no wastes", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const wastesRepository = new InMemoryWastesRepository();
		const sut = new GetCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
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
		const wastesRepository = new InMemoryWastesRepository();
		const sut = new GetCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
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
