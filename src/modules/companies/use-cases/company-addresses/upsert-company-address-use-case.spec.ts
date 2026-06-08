import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeAddressInput } from "@/modules/companies/factories/make-address.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryAddressesRepository } from "@/modules/companies/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { UpsertCompanyAddressUseCase } from "./upsert-company-address-use-case.js";

describe("upsert-company-address-use-case", () => {
	it("creates address when company does not have one", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyAddressUseCase(
			companiesRepository,
			addressesRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		const addressData = makeAddressInput();

		const result = await sut.execute({
			userId,
			companyId: company.id,
			data: addressData,
		});

		expect(result.zip_code).toBe(addressData.zip_code);
		expect(result.street).toBe(addressData.street);
		expect(result.number).toBe(addressData.number);
		expect(result.complement).toBe(addressData.complement);
		expect(result.district).toBe(addressData.district);
		expect(result.city).toBe(addressData.city);
		expect(result.state).toBe(addressData.state);
		expect(result.state_code).toBe(addressData.state_code);
		expect(result.latitude).toBe(addressData.latitude);
		expect(result.longitude).toBe(addressData.longitude);
		expect(addressesRepository.items.length).toBe(1);
	});

	it("updates existing address when company already has one", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyAddressUseCase(
			companiesRepository,
			addressesRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		const addressData = makeAddressInput();
		await addressesRepository.create({
			company_id: company.id,
			...addressData,
		});

		const result = await sut.execute({
			userId,
			companyId: company.id,
			data: {
				...addressData,
				street: "Updated Street",
				number: "200",
				city: "Campinas",
			},
		});

		expect(result.street).toBe("Updated Street");
		expect(result.number).toBe("200");
		expect(result.city).toBe("Campinas");
		expect(result.zip_code).toBe(addressData.zip_code);
		expect(addressesRepository.items.length).toBe(1);
	});

	it("sets address validation to true when address has lat and lng", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyAddressUseCase(
			companiesRepository,
			addressesRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		await sut.execute({
			userId,
			companyId: company.id,
			data: makeAddressInput(),
		});

		const validation = await validationRepository.findByCompanyId(company.id);

		expect(validation?.address).toBe(true);
	});

	it("throws when company does not exist", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyAddressUseCase(
			companiesRepository,
			addressesRepository,
			validationRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: randomUUID(),
				data: makeAddressInput(),
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
