import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { UpdateCompanyUseCase } from "./update-company-use-case.js";

describe("update-company-use-case", () => {
	it("updates an existing company by userId and companyId", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new UpdateCompanyUseCase(companiesRepository);

		const created = await companiesRepository.create({
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
			description: null,
		});

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: created.id,
			data: {
				identity: "99888777000166",
				identity_type: "CNPJ",
				company_type: "ONG",
				status: false,
				is_headquarters: true,
				business_name: "Oikos Solidaria",
				corporate_name: "Oikos Solidaria SA",
				accept_appointments: true,
				email: "solidaria@oikos.dev",
				phones: ["5511777777777", "5511666666666"],
			},
		});

		expect(result?.identity).toBe("99888777000166");
		expect(result?.identity_type).toBe("CNPJ");
		expect(result?.company_type).toBe("ONG");
		expect(result?.status).toBe(false);
		expect(result?.is_headquarters).toBe(true);
		expect(result?.business_name).toBe("Oikos Solidaria");
		expect(result?.corporate_name).toBe("Oikos Solidaria SA");
		expect(result?.accept_appointments).toBe(true);
		expect(result?.email).toBe("solidaria@oikos.dev");
		expect(result?.phones).toStrictEqual(["5511777777777", "5511666666666"]);
	});

	it("throws when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new UpdateCompanyUseCase(companiesRepository);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				companyId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
				data: {
					corporate_name: "Updated Company",
				},
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

	it("throws when company belongs to a different user", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new UpdateCompanyUseCase(companiesRepository);

		const created = await companiesRepository.create({
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
			description: null,
		});

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "22222222-2222-2222-2222-222222222222",
				companyId: created.id,
				data: {
					corporate_name: "Hacked Company",
				},
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
