import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryWastesRepository } from "@/modules/companies/repositories/in-memory/in-memory-wastes-repository.js";
import { UpsertCompanyWastesUseCase } from "./upsert-company-wastes-use-case.js";

async function seedCompany(companiesRepository: InMemoryCompaniesRepository) {
	return companiesRepository.create({
		user_id: "11111111-1111-1111-1111-111111111111",
		identity: "12345678900",
		identity_type: "CPF",
		company_type: "COMPANY",
		status: true,
		is_headquarters: false,
		business_name: "Oikos Tech",
		corporate_name: "Oikos Tech LTDA",
		accept_appointments: false,
		email: "contato@oikos.dev",
		phones: ["5511999999999"],
		started_activity_in: new Date("2024-01-01T00:00:00.000Z"),
	});
}

describe("upsert-company-wastes-use-case", () => {
	it("replaces company wastes and returns the saved list", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const wastesRepository = new InMemoryWastesRepository();
		const sut = new UpsertCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
		);

		await seedCompany(companiesRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: [
				{
					name: "Paper",
					description: "Paper waste",
					price: 12.5,
					unit: "KG",
					waste_type: "RECYCLABLE",
					sub_items: ["cardboard"],
				},
				{
					name: "Organic",
					description: null,
					price: 4.75,
					unit: "KG",
					waste_type: "GARBAGE",
					sub_items: null,
				},
			],
		});

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("Paper");
		expect(result[0].description).toBe("Paper waste");
		expect(result[0].price).toBe(12.5);
		expect(result[0].unit).toBe("KG");
		expect(result[0].waste_type).toBe("RECYCLABLE");
		expect(result[0].sub_items).toStrictEqual(["cardboard"]);
		expect(result[1].name).toBe("Organic");
		expect(result[1].description).toBeNull();
		expect(result[1].price).toBe(4.75);
		expect(result[1].unit).toBe("KG");
		expect(result[1].waste_type).toBe("GARBAGE");
		expect(result[1].sub_items).toBeNull();
		expect(wastesRepository.items.length).toBe(2);

		const updated = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: [
				{
					name: "Glass",
					description: null,
					price: 18,
					unit: "KG",
					waste_type: "RECYCLABLE",
					sub_items: ["bottles"],
				},
			],
		});

		expect(updated).toHaveLength(1);
		expect(updated[0].name).toBe("Glass");
		expect(updated[0].sub_items).toStrictEqual(["bottles"]);
		expect(wastesRepository.items.length).toBe(1);
	});

	it("throws when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const wastesRepository = new InMemoryWastesRepository();
		const sut = new UpsertCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
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
		const companiesRepository = new InMemoryCompaniesRepository();
		const wastesRepository = new InMemoryWastesRepository();
		const sut = new UpsertCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
		);

		await seedCompany(companiesRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				data: [
					{
						name: "Paper",
						description: null,
						price: 10,
						unit: "KG",
						waste_type: "RECYCLABLE",
						sub_items: null,
					},
					{
						name: "Paper",
						description: "duplicate",
						price: 20,
						unit: "KG",
						waste_type: "GARBAGE",
						sub_items: null,
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
});
