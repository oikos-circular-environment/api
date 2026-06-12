import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompany } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { InMemoryServicesRepository } from "@/modules/companies/repositories/in-memory/in-memory-services-repository.js";
import { makeWasteCategory } from "@/modules/wastes/factories/make-waste-category.js";
import { InMemoryWasteCategoriesRepository } from "@/modules/wastes/repositories/in-memory/in-memory-waste-categories-repository.js";
import { UpsertCompanyServicesUseCase } from "./upsert-company-services-use-case.js";

describe("upsert-company-services-use-case", () => {
	let userId: string;
	let categoryId: string;
	let otherCategoryId: string;
	let companiesRepository: InMemoryCompaniesRepository;
	let servicesRepository: InMemoryServicesRepository;
	let validationRepository: InMemoryCompanyValidationRepository;
	let wasteCategoriesRepository: InMemoryWasteCategoriesRepository;
	let sut: UpsertCompanyServicesUseCase;

	beforeEach(() => {
		userId = randomUUID();
		categoryId = randomUUID();
		otherCategoryId = randomUUID();
		companiesRepository = new InMemoryCompaniesRepository();
		servicesRepository = new InMemoryServicesRepository();
		validationRepository = new InMemoryCompanyValidationRepository();
		wasteCategoriesRepository = new InMemoryWasteCategoriesRepository();
		const cat1 = makeWasteCategory({ id: categoryId, name: "Plástico" });
		const cat2 = makeWasteCategory({
			id: otherCategoryId,
			name: "Metal / Alumínio",
		});
		wasteCategoriesRepository.items = [cat1, cat2];
		servicesRepository.categoryMap = new Map([
			[categoryId, cat1],
			[otherCategoryId, cat2],
		]);
		sut = new UpsertCompanyServicesUseCase(
			companiesRepository,
			servicesRepository,
			validationRepository,
			wasteCategoriesRepository,
		);
	});

	it("replaces company services and returns the saved list", async () => {
		const company = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		const result = await sut.execute({
			userId,
			companyId: company.id,
			data: [
				{
					name: "Coleta de plástico",
					description: "Coleta de embalagens plásticas",
					price: 250,
					unit: "UNIT",
					waste_category_id: categoryId,
					quantity: 2.5,
				},
				{
					name: "Coleta de metal",
					description: null,
					price: 150.75,
					unit: "KG",
					waste_category_id: otherCategoryId,
					quantity: 1,

				},
			],
		});

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("Coleta de plástico");
		expect(result[0].waste_category_id).toBe(categoryId);
		expect(result[0].waste_category.name).toBe("Plástico");
		expect(result[1].name).toBe("Coleta de metal");
		expect(result[1].waste_category_id).toBe(otherCategoryId);
		expect(servicesRepository.items.length).toBe(2);

		const updated = await sut.execute({
			userId,
			companyId: company.id,
			data: [
				{
					name: "Triagem",
					description: "Serviço de triagem",
					price: 99.9,
					unit: "UNIT",
					waste_category_id: categoryId,
					quantity: 3,

				},
			],
		});

		expect(updated).toHaveLength(1);
		expect(updated[0].name).toBe("Triagem");
		expect(servicesRepository.items.length).toBe(1);
	});

	it("sets services validation to true when at least one service is saved", async () => {
		const company = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		await sut.execute({
			userId,
			companyId: company.id,
			data: [
				{
					name: "Coleta",
					description: null,
					price: 100,
					unit: "UNIT",
					waste_category_id: categoryId,
					quantity: 1,

				},
			],
		});

		const validation = await validationRepository.findByCompanyId(company.id);

		expect(validation?.services).toBe(true);
	});

	it("sets services validation to false when replaced with empty array", async () => {
		const company = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		await sut.execute({
			userId,
			companyId: company.id,
			data: [
				{
					name: "Coleta",
					description: null,
					price: 100,
					unit: "UNIT",
					waste_category_id: categoryId,
					quantity: 1,

				},
			],
		});

		await sut.execute({ userId, companyId: company.id, data: [] });

		const validation = await validationRepository.findByCompanyId(company.id);

		expect(validation?.services).toBe(false);
	});

	it("throws when company does not exist", async () => {
		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: randomUUID(),
				data: [],
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

	it("throws when payload has duplicated service names", async () => {
		const company = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: company.id,
				data: [
					{
						name: "Coleta",
						description: null,
						price: 100,
						unit: "UNIT",
						waste_category_id: categoryId,
						quantity: 1,
	
					},
					{
						name: "Coleta",
						description: "duplicado",
						price: 120,
						unit: "UNIT",
						waste_category_id: otherCategoryId,
						quantity: 2,
	
					},
				],
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.message).toBe("Duplicated name in payload");
			expect(thrownError.code).toBe("DUPLICATED_ITEM_NAME");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when waste_category_id does not exist", async () => {
		const company = await companiesRepository.create(
			makeCompany({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: company.id,
				data: [
					{
						name: "Coleta",
						description: null,
						price: 100,
						unit: "UNIT",
						waste_category_id: randomUUID(),
						quantity: 1,
	
					},
				],
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("WASTE_CATEGORY_NOT_FOUND");
			expect(thrownError.statusCode).toBe(422);
		}
	});
});
