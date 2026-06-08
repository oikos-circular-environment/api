import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryBusinessHoursRepository } from "@/modules/companies/repositories/in-memory/in-memory-business-hours-repository.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { GetCompanyBusinessHoursUseCase } from "./get-company-business-hours-use-case.js";

describe("get-company-business-hours-use-case", () => {
	it("returns sunday to saturday even when no data exists", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const sut = new GetCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);

		const result = await sut.execute({
			userId,
			companyId: company.id,
		});

		expect(result.length).toBe(7);
		expect(result[0].day_of_week).toBe("SUNDAY");
		expect(result[6].day_of_week).toBe("SATURDAY");
		expect(result.every((item) => item.is_open === false)).toBe(true);
	});

	it("keeps existing business hours and fills missing days", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const sut = new GetCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);

		await businessHoursRepository.upsertMany(company.id, [
			{
				day_of_week: "MONDAY",
				is_open: true,
				time_slots: [{ start_time: "08:00", end_time: "17:00" }],
			},
		]);

		const result = await sut.execute({
			userId,
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
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const sut = new GetCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
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
			expect(thrownError.code).toBe("COMPANY_NOT_FOUND");
			expect(thrownError.statusCode).toBe(404);
		}
	});
});
