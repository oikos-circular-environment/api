import { describe, expect, it } from "vitest";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { CreateCompanyUseCase } from "./create-company-use-case.js";

describe("create-company-use-case", () => {
	it("creates a company for the user", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new CreateCompanyUseCase(companiesRepository);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				identity: "12345678900",
				identity_type: "CPF",
				company_type: "COMPANY",
				status: true,
				is_headquarters: true,
				business_name: "Oikos Tech",
				corporate_name: "Oikos Tech LTDA",
				accept_appointments: true,
				email: "contato@oikos.dev",
				phones: ["5511999999999", "5511888888888"],
				started_activity_in: new Date("2024-01-01T00:00:00.000Z"),
			},
		});

		expect(result.user_id).toBe("11111111-1111-1111-1111-111111111111");
		expect(result.identity).toBe("12345678900");
		expect(result.identity_type).toBe("CPF");
		expect(result.company_type).toBe("COMPANY");
		expect(result.status).toBe(true);
		expect(result.is_headquarters).toBe(true);
		expect(result.business_name).toBe("Oikos Tech");
		expect(result.corporate_name).toBe("Oikos Tech LTDA");
		expect(result.accept_appointments).toBe(true);
		expect(result.email).toBe("contato@oikos.dev");
		expect(result.phones).toStrictEqual(["5511999999999", "5511888888888"]);
		expect(result.id.length > 0).toBe(true);
	});

	it("allows the same user to create multiple companies with different identities", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const sut = new CreateCompanyUseCase(companiesRepository);

		await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
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
			},
		});

		await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			data: {
				identity: "99888777000166",
				identity_type: "CNPJ",
				company_type: "ONG",
				status: true,
				is_headquarters: true,
				business_name: null,
				corporate_name: "Nova Oikos SA",
				accept_appointments: true,
				email: "nova@oikos.dev",
				phones: ["5511777777777"],
				started_activity_in: new Date("2025-01-01T00:00:00.000Z"),
			},
		});

		expect(companiesRepository.items.length).toBe(2);
		expect(
			companiesRepository.items.every(
				(c) => c.user_id === "11111111-1111-1111-1111-111111111111",
			),
		).toBe(true);
	});
});
