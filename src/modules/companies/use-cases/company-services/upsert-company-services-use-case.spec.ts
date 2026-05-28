import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryServicesRepository } from "@/modules/companies/repositories/in-memory/in-memory-services-repository.js";
import { UpsertCompanyServicesUseCase } from "./upsert-company-services-use-case.js";

const baseCompany = {
	user_id: "11111111-1111-1111-1111-111111111111",
	identity: "12345678900",
	identity_type: "CPF" as const,
	company_type: "COMPANY" as const,
	status: true,
	is_headquarters: false,
	business_name: "Oikos Tech",
	corporate_name: "Oikos Tech LTDA",
	accept_appointments: false,
	email: "contato@oikos.dev",
	phones: ["5511999999999"],
	started_activity_in: new Date("2024-01-01T00:00:00.000Z"),
	description: null,
};

describe("upsert-company-services-use-case", () => {
	it("replaces company services and returns the saved list", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const servicesRepository = new InMemoryServicesRepository();
		const sut = new UpsertCompanyServicesUseCase(
			companiesRepository,
			servicesRepository,
		);

		const company = await companiesRepository.create(baseCompany);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: company.id,
			data: [
				{
					name: "Collection",
					description: "Waste collection",
					price: 250,
					unit: "UNIT",
					waste_type: "GARBAGE",
					quantity: 2.5,
					observations: "Includes transport",
					sub_items: ["bins"],
				},
				{
					name: "Sorting",
					description: null,
					price: 150.75,
					unit: "KG",
					waste_type: "RECYCLABLE",
					quantity: 1,
					observations: null,
					sub_items: null,
				},
			],
		});

		expect(result).toHaveLength(2);
		expect(result[0].name).toBe("Collection");
		expect(result[0].description).toBe("Waste collection");
		expect(result[0].price).toBe(250);
		expect(result[0].unit).toBe("UNIT");
		expect(result[0].waste_type).toBe("GARBAGE");
		expect(result[0].quantity).toBe(2.5);
		expect(result[0].observations).toBe("Includes transport");
		expect(result[0].sub_items).toStrictEqual(["bins"]);
		expect(result[1].name).toBe("Sorting");
		expect(result[1].description).toBeNull();
		expect(result[1].price).toBe(150.75);
		expect(result[1].unit).toBe("KG");
		expect(result[1].waste_type).toBe("RECYCLABLE");
		expect(result[1].quantity).toBe(1);
		expect(result[1].observations).toBeNull();
		expect(result[1].sub_items).toBeNull();
		expect(servicesRepository.items.length).toBe(2);

		const updated = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: company.id,
			data: [
				{
					name: "Consulting",
					description: "Advisory service",
					price: 99.9,
					unit: "UNIT",
					waste_type: "GARBAGE",
					quantity: 3,
					observations: null,
					sub_items: ["planning"],
				},
			],
		});

		expect(updated).toHaveLength(1);
		expect(updated[0].name).toBe("Consulting");
		expect(updated[0].quantity).toBe(3);
		expect(servicesRepository.items.length).toBe(1);
	});

	it("throws when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const servicesRepository = new InMemoryServicesRepository();
		const sut = new UpsertCompanyServicesUseCase(
			companiesRepository,
			servicesRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
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
		const companiesRepository = new InMemoryCompaniesRepository();
		const servicesRepository = new InMemoryServicesRepository();
		const sut = new UpsertCompanyServicesUseCase(
			companiesRepository,
			servicesRepository,
		);

		const company = await companiesRepository.create(baseCompany);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				companyId: company.id,
				data: [
					{
						name: "Collection",
						description: null,
						price: 100,
						unit: "UNIT",
						waste_type: "GARBAGE",
						quantity: 1,
						observations: null,
						sub_items: null,
					},
					{
						name: "Collection",
						description: "duplicate",
						price: 120,
						unit: "UNIT",
						waste_type: "RECYCLABLE",
						quantity: 2,
						observations: null,
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
