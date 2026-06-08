import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { InMemoryServicesRepository } from "@/modules/companies/repositories/in-memory/in-memory-services-repository.js";
import { makeWasteCategory } from "@/modules/wastes/factories/make-waste-category.js";
import { InMemoryWasteCategoriesRepository } from "@/modules/wastes/repositories/in-memory/in-memory-waste-categories-repository.js";
import { UpsertCompanyServicesUseCase } from "./upsert-company-services-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const CATEGORY_ID = randomUUID();
const OTHER_CATEGORY_ID = randomUUID();

describe("upsert-company-services-use-case", () => {
	let companiesRepository: InMemoryCompaniesRepository;
	let servicesRepository: InMemoryServicesRepository;
	let validationRepository: InMemoryCompanyValidationRepository;
	let wasteCategoriesRepository: InMemoryWasteCategoriesRepository;
	let sut: UpsertCompanyServicesUseCase;

	beforeEach(() => {
		companiesRepository = new InMemoryCompaniesRepository();
		servicesRepository = new InMemoryServicesRepository();
		validationRepository = new InMemoryCompanyValidationRepository();
		wasteCategoriesRepository = new InMemoryWasteCategoriesRepository();
		const cat1 = makeWasteCategory({ id: CATEGORY_ID, name: "Plástico" });
		const cat2 = makeWasteCategory({
			id: OTHER_CATEGORY_ID,
			name: "Metal / Alumínio",
		});
		wasteCategoriesRepository.items = [cat1, cat2];
		servicesRepository.categoryMap = new Map([
			[CATEGORY_ID, cat1],
			[OTHER_CATEGORY_ID, cat2],
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
			makeCompanyInput({ user_id: USER_ID }),
		);
		await validationRepository.create(company.id, true);

		const result = await sut.execute({
			userId: USER_ID,
			companyId: company.id,
			data: [
				{
					name: "Coleta de plástico",
					description: "Coleta de embalagens plásticas",
					price: 250,
					unit: "UNIT",
					waste_category_id: CATEGORY_ID,
					quantity: 2.5,
					observations: "Inclui transporte",
				},
				{
					name: "Coleta de metal",
					description: null,
					price: 150.75,
					unit: "KG",
					waste_category_id: OTHER_CATEGORY_ID,
					quantity: 1,
					observations: null,
				},
			],
		});

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("Coleta de plástico");
		expect(result[0].waste_category_id).toBe(CATEGORY_ID);
		expect(result[0].waste_category.name).toBe("Plástico");
		expect(result[1].name).toBe("Coleta de metal");
		expect(result[1].waste_category_id).toBe(OTHER_CATEGORY_ID);
		expect(servicesRepository.items.length).toBe(2);

		const updated = await sut.execute({
			userId: USER_ID,
			companyId: company.id,
			data: [
				{
					name: "Triagem",
					description: "Serviço de triagem",
					price: 99.9,
					unit: "UNIT",
					waste_category_id: CATEGORY_ID,
					quantity: 3,
					observations: null,
				},
			],
		});

		expect(updated).toHaveLength(1);
		expect(updated[0].name).toBe("Triagem");
		expect(servicesRepository.items.length).toBe(1);
	});

	it("sets services validation to true when at least one service is saved", async () => {
		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);
		await validationRepository.create(company.id, true);

		await sut.execute({
			userId: USER_ID,
			companyId: company.id,
			data: [
				{
					name: "Coleta",
					description: null,
					price: 100,
					unit: "UNIT",
					waste_category_id: CATEGORY_ID,
					quantity: 1,
					observations: null,
				},
			],
		});

		const validation = await validationRepository.findByCompanyId(company.id);

		expect(validation?.services).toBe(true);
	});

	it("sets services validation to false when replaced with empty array", async () => {
		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);
		await validationRepository.create(company.id, true);

		await sut.execute({
			userId: USER_ID,
			companyId: company.id,
			data: [
				{
					name: "Coleta",
					description: null,
					price: 100,
					unit: "UNIT",
					waste_category_id: CATEGORY_ID,
					quantity: 1,
					observations: null,
				},
			],
		});

		await sut.execute({ userId: USER_ID, companyId: company.id, data: [] });

		const validation = await validationRepository.findByCompanyId(company.id);

		expect(validation?.services).toBe(false);
	});

	it("throws when company does not exist", async () => {
		let thrownError: unknown;

		try {
			await sut.execute({
				userId: USER_ID,
				companyId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
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
			makeCompanyInput({ user_id: USER_ID }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: USER_ID,
				companyId: company.id,
				data: [
					{
						name: "Coleta",
						description: null,
						price: 100,
						unit: "UNIT",
						waste_category_id: CATEGORY_ID,
						quantity: 1,
						observations: null,
					},
					{
						name: "Coleta",
						description: "duplicado",
						price: 120,
						unit: "UNIT",
						waste_category_id: OTHER_CATEGORY_ID,
						quantity: 2,
						observations: null,
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
			makeCompanyInput({ user_id: USER_ID }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: USER_ID,
				companyId: company.id,
				data: [
					{
						name: "Coleta",
						description: null,
						price: 100,
						unit: "UNIT",
						waste_category_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
						quantity: 1,
						observations: null,
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
