import { describe, expect, it } from "vitest";
import { InMemoryAddressesRepository } from "@/modules/companies/repositories/in-memory/in-memory-addresses-repository.js";
import { InMemoryBusinessHoursRepository } from "@/modules/companies/repositories/in-memory/in-memory-business-hours-repository.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryServicesRepository } from "@/modules/companies/repositories/in-memory/in-memory-services-repository.js";
import { InMemoryWastesRepository } from "@/modules/companies/repositories/in-memory/in-memory-wastes-repository.js";
import { GetCompanyUseCase } from "./get-company-use-case.js";

const baseCompany = {
	user_id: "11111111-1111-1111-1111-111111111111",
	identity: "12345678900",
	identity_type: "CPF" as const,
	company_type: "COMPANY" as const,
	status: true,
	business_name: "Oikos Tech",
	corporate_name: "Oikos Tech LTDA",
	email: "contato@oikos.dev",
	phones: ["5511999999999"],
	started_activity_in: new Date("2024-01-01T00:00:00.000Z"),
};

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

		const company = await companiesRepository.create(baseCompany);

		await addressesRepository.create({
			company_id: company.id,
			zip_code: "12345678",
			street: "Main Street",
			number: "100",
			complement: null,
			district: "Center",
			city_ibge_id: 3550308,
			city: "Sao Paulo",
			state_ibge_id: 35,
			state: "Sao Paulo",
			state_code: "SP",
			latitude: -23.5505,
			longitude: -46.6333,
		});

		await wastesRepository.replaceMany(company.id, [
			{
				name: "Paper",
				description: null,
				price: 10,
				unit: "KG",
				waste_category_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
				quantity: 100,
				observations: null,
			},
		]);

		await companiesRepository.create({
			user_id: "11111111-1111-1111-1111-111111111111",
			identity: "99888777000166",
			identity_type: "CNPJ",
			company_type: "ONG",
			status: true,
			business_name: "Nova Oikos",
			corporate_name: "Nova Oikos SA",
			email: null,
			phones: ["5511777777777"],
			started_activity_in: new Date("2025-01-01T00:00:00.000Z"),
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toHaveLength(2);
		expect(result[0].address?.city).toBe("Sao Paulo");
		expect(result[0].wastes).toHaveLength(1);
		expect(result[0].wastes[0].name).toBe("Paper");
		expect(result[0].services).toStrictEqual([]);
		expect(result[0].business_hours).toStrictEqual([]);
		expect(result[1].corporate_name).toBe("Nova Oikos SA");
		expect(result[1].address).toBeNull();
		expect(result[1].wastes).toStrictEqual([]);
	});

	it("returns empty arrays for related data when company has none", async () => {
		const { sut, companiesRepository } = makeSut();

		await companiesRepository.create(baseCompany);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toHaveLength(1);
		expect(result[0].address).toBeNull();
		expect(result[0].business_hours).toStrictEqual([]);
		expect(result[0].wastes).toStrictEqual([]);
		expect(result[0].services).toStrictEqual([]);
	});

	it("returns empty array when user has no companies", async () => {
		const { sut } = makeSut();

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
		});

		expect(result).toStrictEqual([]);
	});
});
