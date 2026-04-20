import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryAddressesRepository } from "@/modules/companies/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyAddressesRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-addresses-repository.js";
import { GetCompanyAddressUseCase } from "./get-company-address-use-case.js";

describe("get-company-address-use-case", () => {
	it("returns company address when it exists", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const companyAddressesRepository = new InMemoryCompanyAddressesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new GetCompanyAddressUseCase(
			companiesRepository,
			companyAddressesRepository,
			addressesRepository,
		);

		const company = await companiesRepository.create({
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

		const address = await addressesRepository.create({
			company_id: company.id,
			zip_code: "12345678",
			street: "Main Street",
			number: "100",
			complement: "Suite 2",
			district: "Center",
			city: "Sao Paulo",
			state: "Sao Paulo",
			state_code: "SP",
			latitude: -23.5505,
			longitude: -46.6333,
		});

		await companyAddressesRepository.create({
			company_id: company.id,
			address_id: address.id,
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toStrictEqual(address);
	});

	it("returns null when company does not have an address", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const companyAddressesRepository = new InMemoryCompanyAddressesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new GetCompanyAddressUseCase(
			companiesRepository,
			companyAddressesRepository,
			addressesRepository,
		);

		await companiesRepository.create({
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

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toBe(null);
	});

	it("throws when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const companyAddressesRepository = new InMemoryCompanyAddressesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new GetCompanyAddressUseCase(
			companiesRepository,
			companyAddressesRepository,
			addressesRepository,
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

	it("throws when company address relation exists but address does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const companyAddressesRepository = new InMemoryCompanyAddressesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new GetCompanyAddressUseCase(
			companiesRepository,
			companyAddressesRepository,
			addressesRepository,
		);

		const company = await companiesRepository.create({
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

		await companyAddressesRepository.create({
			company_id: company.id,
			address_id: "11111111-1111-1111-1111-111111111112",
		});

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
			expect(thrownError.message).toBe("Address not found");
			expect(thrownError.code).toBe("ADDRESS_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});
});
