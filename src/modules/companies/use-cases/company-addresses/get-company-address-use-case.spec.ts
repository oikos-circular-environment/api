import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeAddressInput } from "@/modules/companies/factories/make-address.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryAddressesRepository } from "@/modules/companies/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { GetCompanyAddressUseCase } from "./get-company-address-use-case.js";

describe("get-company-address-use-case", () => {
	it("returns company address when it exists", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new GetCompanyAddressUseCase(
			companiesRepository,
			addressesRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);

		const address = await addressesRepository.create({
			company_id: company.id,
			...makeAddressInput(),
		});

		const result = await sut.execute({
			userId,
			companyId: company.id,
		});

		expect(result).toStrictEqual(address);
	});

	it("returns null when company does not have an address", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new GetCompanyAddressUseCase(
			companiesRepository,
			addressesRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);

		const result = await sut.execute({
			userId,
			companyId: company.id,
		});

		expect(result).toBe(null);
	});

	it("throws when company does not exist", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const addressesRepository = new InMemoryAddressesRepository();
		const sut = new GetCompanyAddressUseCase(
			companiesRepository,
			addressesRepository,
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
