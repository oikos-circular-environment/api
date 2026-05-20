import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryWastesRepository } from "@/modules/companies/repositories/in-memory/in-memory-wastes-repository.js";
import { GetCompanyWastesUseCase } from "./get-company-wastes-use-case.js";
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

describe("get-company-wastes-use-case", () => {
	it("returns the company wastes list", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const wastesRepository = new InMemoryWastesRepository();
		const upsertUseCase = new UpsertCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
		);
		const sut = new GetCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
		);

		await seedCompany(companiesRepository);

		await upsertUseCase.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: [
				{
					name: "Paper",
					description: "Paper waste",
					price: 12.5,
					unit: "KG",
					waste_type: "RECYCLABLE",
					quantity: 100,
					observations: null,
					sub_items: ["cardboard"],
				},
			],
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toHaveLength(1);
		expect(result[0].name).toBe("Paper");
		expect(result[0].sub_items).toStrictEqual(["cardboard"]);
	});

	it("returns an empty array when the company has no wastes", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const wastesRepository = new InMemoryWastesRepository();
		const sut = new GetCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
		);

		await seedCompany(companiesRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toStrictEqual([]);
	});

	it("throws when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const wastesRepository = new InMemoryWastesRepository();
		const sut = new GetCompanyWastesUseCase(
			companiesRepository,
			wastesRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
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
