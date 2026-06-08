import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { InMemoryWastesRepository } from "@/modules/companies/repositories/in-memory/in-memory-wastes-repository.js";
import { makeWasteCategory } from "@/modules/wastes/factories/make-waste-category.js";
import { InMemoryWasteCategoriesRepository } from "@/modules/wastes/repositories/in-memory/in-memory-waste-categories-repository.js";
import { UpsertCompanyWastesUseCase } from "./upsert-company-wastes-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const CATEGORY_ID = randomUUID();
const OTHER_CATEGORY_ID = randomUUID();

describe("upsert-company-wastes-use-case", () => {
	let companiesRepository: InMemoryCompaniesRepository;
	let wastesRepository: InMemoryWastesRepository;
	let validationRepository: InMemoryCompanyValidationRepository;
	let wasteCategoriesRepository: InMemoryWasteCategoriesRepository;
	let sut: UpsertCompanyWastesUseCase;

	beforeEach(() => {
		companiesRepository = new InMemoryCompaniesRepository();
		wastesRepository = new InMemoryWastesRepository();
		validationRepository = new InMemoryCompanyValidationRepository();
		wasteCategoriesRepository = new InMemoryWasteCategoriesRepository();
		const cat1 = makeWasteCategory({
			id: CATEGORY_ID,
			name: "Papel / Papelão",
		});
		const cat2 = makeWasteCategory({ id: OTHER_CATEGORY_ID, name: "Plástico" });
		wasteCategoriesRepository.items = [cat1, cat2];
		wastesRepository.categoryMap = new Map([
			[CATEGORY_ID, cat1],
			[OTHER_CATEGORY_ID, cat2],
		]);
		sut = new UpsertCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
			validationRepository,
			wasteCategoriesRepository,
		);
	});

	it("replaces company wastes and returns the saved list", async () => {
		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);
		await validationRepository.create(company.id, true);

		const result = await sut.execute({
			userId: USER_ID,
			companyId: company.id,
			data: [
				{
					name: "Papel",
					description: "Papel reciclável",
					price: 12.5,
					unit: "KG",
					waste_category_id: CATEGORY_ID,
					quantity: 100,
					observations: "Limpo e seco",
				},
				{
					name: "Plástico",
					description: null,
					price: 4.75,
					unit: "KG",
					waste_category_id: OTHER_CATEGORY_ID,
					quantity: 50,
					observations: null,
				},
			],
		});

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("Papel");
		expect(result[0].waste_category_id).toBe(CATEGORY_ID);
		expect(result[0].waste_category.name).toBe("Papel / Papelão");
		expect(result[1].name).toBe("Plástico");
		expect(result[1].waste_category_id).toBe(OTHER_CATEGORY_ID);
		expect(wastesRepository.items.length).toBe(2);

		const updated = await sut.execute({
			userId: USER_ID,
			companyId: company.id,
			data: [
				{
					name: "Vidro",
					description: null,
					price: 18,
					unit: "KG",
					waste_category_id: CATEGORY_ID,
					quantity: 30,
					observations: null,
				},
			],
		});

		expect(updated).toHaveLength(1);
		expect(updated[0].name).toBe("Vidro");
		expect(wastesRepository.items.length).toBe(1);
	});

	it("sets wastes validation to true when at least one waste is saved", async () => {
		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);
		await validationRepository.create(company.id, true);

		await sut.execute({
			userId: USER_ID,
			companyId: company.id,
			data: [
				{
					name: "Papel",
					description: null,
					price: 10,
					unit: "KG",
					waste_category_id: CATEGORY_ID,
					quantity: 10,
					observations: null,
				},
			],
		});

		const validation = await validationRepository.findByCompanyId(company.id);

		expect(validation?.wastes).toBe(true);
	});

	it("sets wastes validation to false when replaced with empty array", async () => {
		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);
		await validationRepository.create(company.id, true);

		await sut.execute({
			userId: USER_ID,
			companyId: company.id,
			data: [
				{
					name: "Papel",
					description: null,
					price: 10,
					unit: "KG",
					waste_category_id: CATEGORY_ID,
					quantity: 10,
					observations: null,
				},
			],
		});

		await sut.execute({ userId: USER_ID, companyId: company.id, data: [] });

		const validation = await validationRepository.findByCompanyId(company.id);

		expect(validation?.wastes).toBe(false);
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

	it("throws when payload has duplicated waste names", async () => {
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
						name: "Papel",
						description: null,
						price: 10,
						unit: "KG",
						waste_category_id: CATEGORY_ID,
						quantity: 10,
						observations: null,
					},
					{
						name: "Papel",
						description: "duplicado",
						price: 20,
						unit: "KG",
						waste_category_id: OTHER_CATEGORY_ID,
						quantity: 5,
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
						name: "Papel",
						description: null,
						price: 10,
						unit: "KG",
						waste_category_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
						quantity: 10,
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
