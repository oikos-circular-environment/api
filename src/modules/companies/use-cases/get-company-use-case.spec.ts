import { describe, expect, it } from "vitest";
import { makeAddressInput } from "@/modules/companies/factories/make-address.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { makeCompanyWasteInput } from "@/modules/companies/factories/make-company-item.js";
import { InMemoryAddressesRepository } from "@/modules/companies/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryBusinessHoursRepository } from "@/modules/companies/repositories/in-memory/in-memory-business-hours-repository.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryServicesRepository } from "@/modules/companies/repositories/in-memory/in-memory-services-repository.js";
import { InMemoryWastesRepository } from "@/modules/companies/repositories/in-memory/in-memory-wastes-repository.js";
import { GetCompanyUseCase } from "./get-company-use-case.js";

const USER_ID = "11111111-1111-1111-1111-111111111111";

function makeSut() {
	const companiesRepository = new InMemoryCompaniesRepository();
	const addressesRepository = new InMemoryAddressesRepository();
	const businessHoursRepository = new InMemoryBusinessHoursRepository();
	const wastesRepository = new InMemoryWastesRepository();
	const servicesRepository = new InMemoryServicesRepository();

	const sut = new GetCompanyUseCase(
		companiesRepository,
		addressesRepository,
		businessHoursRepository,
		wastesRepository,
		servicesRepository,
	);

	return {
		sut,
		companiesRepository,
		addressesRepository,
		wastesRepository,
		servicesRepository,
	};
}

describe("get-company-use-case", () => {
	it("returns all companies for a user with related data", async () => {
		const { sut, companiesRepository, addressesRepository, wastesRepository } =
			makeSut();

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: USER_ID }),
		);

		const address = await addressesRepository.create({
			company_id: company.id,
			...makeAddressInput({ city: "Sao Paulo" }),
		});

		const wasteInput = makeCompanyWasteInput();
		await wastesRepository.replaceMany(company.id, [wasteInput]);

		const secondInput = makeCompanyInput({
			user_id: USER_ID,
			corporate_name: "Nova Oikos SA",
		});
		await companiesRepository.create(secondInput);

		const result = await sut.execute({ userId: USER_ID });

		expect(result).toHaveLength(2);
		expect(result[0].address?.city).toBe(address.city);
		expect(result[0].wastes).toHaveLength(1);
		expect(result[0].wastes[0].name).toBe(wasteInput.name);
		expect(result[0].services).toStrictEqual([]);
		expect(result[0].business_hours).toStrictEqual([]);
		expect(result[1].corporate_name).toBe("Nova Oikos SA");
		expect(result[1].address).toBeNull();
		expect(result[1].wastes).toStrictEqual([]);
	});

	it("returns empty arrays for related data when company has none", async () => {
		const { sut, companiesRepository } = makeSut();

		await companiesRepository.create(makeCompanyInput({ user_id: USER_ID }));

		const result = await sut.execute({ userId: USER_ID });

		expect(result).toHaveLength(1);
		expect(result[0].address).toBeNull();
		expect(result[0].business_hours).toStrictEqual([]);
		expect(result[0].wastes).toStrictEqual([]);
		expect(result[0].services).toStrictEqual([]);
	});

	it("returns empty array when user has no companies", async () => {
		const { sut } = makeSut();

		const result = await sut.execute({ userId: USER_ID });

		expect(result).toStrictEqual([]);
	});
});
