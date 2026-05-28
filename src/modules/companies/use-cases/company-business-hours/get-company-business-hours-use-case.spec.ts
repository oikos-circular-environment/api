import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { InMemoryBusinessHoursRepository } from "@/modules/companies/repositories/in-memory/in-memory-business-hours-repository.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { GetCompanyBusinessHoursUseCase } from "./get-company-business-hours-use-case.js";

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

describe("get-company-business-hours-use-case", () => {
	it("returns sunday to saturday even when no data exists", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const sut = new GetCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
		);

		const company = await companiesRepository.create(baseCompany);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: company.id,
		});

		expect(result.length).toBe(7);
		expect(result[0].day_of_week).toBe("SUNDAY");
		expect(result[6].day_of_week).toBe("SATURDAY");
		expect(result.every((item) => item.is_open === false)).toBe(true);
	});

	it("keeps existing business hours and fills missing days", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const sut = new GetCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
		);

		const company = await companiesRepository.create(baseCompany);

		await businessHoursRepository.upsertMany(company.id, [
			{
				day_of_week: "MONDAY",
				is_open: true,
				time_slots: [
					{
						start_time: "08:00",
						end_time: "17:00",
					},
				],
			},
		]);

		const result = await sut.execute({
			userId: "11111111-1111-1111-1111-111111111111",
			companyId: company.id,
		});

		expect(result.length).toBe(7);
		expect(result[1].day_of_week).toBe("MONDAY");
		expect(result[1].is_open).toBe(true);
		expect(result[1].time_slots.length).toBe(1);
		expect(result[0].is_open).toBe(false);
		expect(result[6].is_open).toBe(false);
	});

	it("throws when company does not exist", async () => {
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const sut = new GetCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId: "11111111-1111-1111-1111-111111111111",
				companyId: "b4d2f0f6-cf62-4ec2-853f-7b96f50763ff",
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("COMPANY_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});
});
