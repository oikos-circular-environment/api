import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AppError } from "@/modules/common/errors/app-error.js";
import { makeCompanyInput } from "@/modules/companies/factories/make-company.js";
import { InMemoryBusinessHoursRepository } from "@/modules/companies/repositories/in-memory/in-memory-business-hours-repository.js";
import { InMemoryCompaniesRepository } from "@/modules/companies/repositories/in-memory/in-memory-companies-repositories.js";
import { InMemoryCompanyValidationRepository } from "@/modules/companies/repositories/in-memory/in-memory-company-validation-repository.js";
import { UpsertCompanyBusinessHoursUseCase } from "./upsert-company-business-hours-use-case.js";

describe("upsert-company-business-hours-use-case", () => {
	it("upserts partial payload and persists sunday to saturday", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		const result = await sut.execute({
			userId,
			companyId: company.id,
			data: [
				{
					day_of_week: "MONDAY",
					is_open: true,
					time_slots: [{ start_time: "07:00", end_time: "11:00" }],
				},
				{
					day_of_week: "FRIDAY",
					is_open: true,
					time_slots: [{ start_time: "08:00", end_time: "17:00" }],
				},
			],
		});

		expect(result.length).toBe(7);
		expect(result[0].day_of_week).toBe("SUNDAY");
		expect(result[1].day_of_week).toBe("MONDAY");
		expect(result[1].is_open).toBe(true);
		expect(result[1].time_slots).toStrictEqual([
			{
				id: result[1].time_slots[0].id,
				start_time: "07:00",
				end_time: "11:00",
			},
		]);
		expect(result[5].day_of_week).toBe("FRIDAY");
		expect(result[5].is_open).toBe(true);
		expect(result[6].day_of_week).toBe("SATURDAY");
		expect(result[6].is_open).toBe(false);
		expect(result[6].time_slots).toStrictEqual([]);
	});

	it("keeps existing day values when payload does not include the day", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		await sut.execute({
			userId,
			companyId: company.id,
			data: [
				{
					day_of_week: "MONDAY",
					is_open: true,
					time_slots: [{ start_time: "07:00", end_time: "11:00" }],
				},
			],
		});

		const result = await sut.execute({
			userId,
			companyId: company.id,
			data: [
				{
					day_of_week: "FRIDAY",
					is_open: true,
					time_slots: [{ start_time: "08:00", end_time: "17:00" }],
				},
			],
		});

		expect(result[1].day_of_week).toBe("MONDAY");
		expect(result[1].is_open).toBe(true);
		expect(result[1].time_slots.length).toBe(1);
		expect(result[5].day_of_week).toBe("FRIDAY");
		expect(result[5].is_open).toBe(true);
		expect(result[5].time_slots.length).toBe(1);
	});

	it("sets business_hours validation to true when at least one open day has a slot", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		await sut.execute({
			userId,
			companyId: company.id,
			data: [
				{
					day_of_week: "MONDAY",
					is_open: true,
					time_slots: [{ start_time: "08:00", end_time: "17:00" }],
				},
			],
		});

		const validation = await validationRepository.findByCompanyId(company.id);

		expect(validation?.business_hours).toBe(true);
	});

	it("sets business_hours validation to false when all days are closed", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		await sut.execute({
			userId,
			companyId: company.id,
			data: [{ day_of_week: "MONDAY", is_open: false, time_slots: [] }],
		});

		const validation = await validationRepository.findByCompanyId(company.id);

		expect(validation?.business_hours).toBe(false);
	});

	it("throws when time_slots is empty and is_open is true", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: company.id,
				data: [{ day_of_week: "SUNDAY", is_open: true, time_slots: [] }],
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("INVALID_BUSINESS_HOUR");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("accepts closed day with empty time_slots", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);
		await validationRepository.create(company.id, true);

		const result = await sut.execute({
			userId,
			companyId: company.id,
			data: [{ day_of_week: "SUNDAY", is_open: false, time_slots: [] }],
		});

		expect(result[0].day_of_week).toBe("SUNDAY");
		expect(result[0].is_open).toBe(false);
		expect(result[0].time_slots).toStrictEqual([]);
	});

	it("throws when day_of_week is duplicated", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: company.id,
				data: [
					{
						day_of_week: "MONDAY",
						is_open: true,
						time_slots: [{ start_time: "08:00", end_time: "17:00" }],
					},
					{ day_of_week: "MONDAY", is_open: false, time_slots: [] },
				],
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("DUPLICATED_DAY_OF_WEEK");
			expect(thrownError.statusCode).toBe(400);
		}
	});

	it("throws when company does not exist", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
			validationRepository,
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: randomUUID(),
				data: [
					{
						day_of_week: "MONDAY",
						is_open: true,
						time_slots: [{ start_time: "08:00", end_time: "17:00" }],
					},
				],
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

	it("throws when start_time is greater than or equal to end_time", async () => {
		const userId = randomUUID();
		const companiesRepository = new InMemoryCompaniesRepository();
		const businessHoursRepository = new InMemoryBusinessHoursRepository();
		const validationRepository = new InMemoryCompanyValidationRepository();
		const sut = new UpsertCompanyBusinessHoursUseCase(
			companiesRepository,
			businessHoursRepository,
			validationRepository,
		);

		const company = await companiesRepository.create(
			makeCompanyInput({ user_id: userId }),
		);

		let thrownError: unknown;

		try {
			await sut.execute({
				userId,
				companyId: company.id,
				data: [
					{
						day_of_week: "MONDAY",
						is_open: true,
						time_slots: [{ start_time: "18:00", end_time: "08:00" }],
					},
				],
			});
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError instanceof AppError).toBe(true);

		if (thrownError instanceof AppError) {
			expect(thrownError.code).toBe("INVALID_TIME_SLOT");
			expect(thrownError.statusCode).toBe(400);
		}
	});
});
