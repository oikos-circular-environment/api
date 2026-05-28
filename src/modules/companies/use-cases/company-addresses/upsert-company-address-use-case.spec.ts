import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryAddressesRepository } from "@/modules/companies/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { UpsertCompanyAddressUseCase } from "./upsert-company-address-use-case.js";

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

const baseAddress = {
	zip_code: "12345678",
	street: "Main Street",
	number: "100",
	complement: "Suite 2",
	district: "Center",
	city_ibge_id: 3550308,
	city: "Sao Paulo",
	state_ibge_id: 35,
	state: "Sao Paulo",
	state_code: "SP",
	latitude: -23.5505,
	longitude: -46.6333,
};

describe("upsert-company-address-use-case", () => {
	it("creates address when company does not have one", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertCompanyAddressUseCase(
			companiesRepository,
			addressesRepository,
		);

		const company = await companiesRepository.create(baseCompany);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: company.id,
			data: baseAddress,
		});

		expect(result.zip_code).toBe("12345678");
		expect(result.street).toBe("Main Street");
		expect(result.number).toBe("100");
		expect(result.complement).toBe("Suite 2");
		expect(result.district).toBe("Center");
		expect(result.city).toBe("Sao Paulo");
		expect(result.state).toBe("Sao Paulo");
		expect(result.state_code).toBe("SP");
		expect(result.latitude).toBe(-23.5505);
		expect(result.longitude).toBe(-46.6333);
		expect(addressesRepository.items.length).toBe(1);
	});

	it("updates existing address when company already has one", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertCompanyAddressUseCase(
			companiesRepository,
			addressesRepository,
		);

		const company = await companiesRepository.create(baseCompany);

		await addressesRepository.create({
			...baseAddress,
			company_id: company.id,
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: company.id,
			data: {
				...baseAddress,
				street: "Updated Street",
				number: "200",
				city: "Campinas",
			},
		});

		expect(result.street).toBe("Updated Street");
		expect(result.number).toBe("200");
		expect(result.city).toBe("Campinas");
		expect(result.zip_code).toBe("12345678");
		expect(addressesRepository.items.length).toBe(1);
	});

	it("throws when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new UpsertCompanyAddressUseCase(
			companiesRepository,
			addressesRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				companyId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				data: baseAddress,
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
