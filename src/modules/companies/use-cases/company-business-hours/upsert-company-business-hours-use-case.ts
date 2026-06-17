import { AppError } from "@/modules/common/errors/app-error.js";
import type {
	BusinessHour,
	BusinessHourUpsertInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { BusinessHoursRepository } from "@/modules/companies/repositories/business-hours-repository.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";
import type { CompanyValidationRepository } from "@/modules/companies/repositories/company-validation-repository.js";
import { isBusinessHoursValid } from "@/modules/companies/utils/company-validation-utils.js";

const ORDERED_DAYS: BusinessHour["day_of_week"][] = [
	"SUNDAY",
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
];

const DAY_ORDER: Record<BusinessHour["day_of_week"], number> = {
	SUNDAY: 0,
	MONDAY: 1,
	TUESDAY: 2,
	WEDNESDAY: 3,
	THURSDAY: 4,
	FRIDAY: 5,
	SATURDAY: 6,
};

type UpsertCompanyBusinessHoursUseCaseRequest = {
	userId: string;
	companyId: string;
	data: BusinessHourUpsertInput[];
};

export class UpsertCompanyBusinessHoursUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly businessHoursRepository: BusinessHoursRepository,
		private readonly validationRepository: CompanyValidationRepository,
	) {}

	async execute({
		userId,
		companyId,
		data,
	}: UpsertCompanyBusinessHoursUseCaseRequest): Promise<BusinessHour[]> {
		const company = await this.companiesRepository.findByUserAndCompanyId(
			userId,
			companyId,
		);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		this.validateIncomingDays(data);
		this.validateBusinessHourRules(data);

		const existing = await this.businessHoursRepository.findByCompanyId(
			company.id,
		);
		const existingByDay = new Map(
			existing.map((item) => [item.day_of_week, item]),
		);
		const incomingByDay = new Map(data.map((item) => [item.day_of_week, item]));

		const normalizedData = ORDERED_DAYS.map((dayOfWeek) => {
			const incoming = incomingByDay.get(dayOfWeek);

			if (incoming) {
				return {
					day_of_week: incoming.day_of_week,
					is_open: incoming.time_slots.length === 0 ? false : incoming.is_open,
					time_slots: incoming.time_slots,
				} satisfies BusinessHourUpsertInput;
			}

			const persisted = existingByDay.get(dayOfWeek);

			if (persisted) {
				return {
					day_of_week: persisted.day_of_week,
					is_open: persisted.is_open,
					time_slots: persisted.time_slots.map((slot) => ({
						start_time: slot.start_time,
						end_time: slot.end_time,
					})),
				} satisfies BusinessHourUpsertInput;
			}

			return {
				day_of_week: dayOfWeek,
				is_open: false,
				time_slots: [],
			} satisfies BusinessHourUpsertInput;
		});

		const saved = await this.businessHoursRepository.upsertMany(
			company.id,
			normalizedData,
		);

		const result = this.sortBusinessHours(saved);

		await this.validationRepository.updateField(
			company.id,
			"business_hours",
			isBusinessHoursValid(result),
		);

		return result;
	}

	private validateIncomingDays(data: BusinessHourUpsertInput[]): void {
		const uniqueDays = new Set(data.map((item) => item.day_of_week));

		if (uniqueDays.size !== data.length) {
			throw new AppError(
				"Duplicated day_of_week in payload",
				"DUPLICATED_DAY_OF_WEEK",
				400,
			);
		}
	}

	private validateBusinessHourRules(data: BusinessHourUpsertInput[]): void {
		for (const item of data) {
			if (item.time_slots.length === 0 && item.is_open) {
				throw new AppError(
					"is_open must be false when time_slots is empty",
					"INVALID_BUSINESS_HOUR",
					400,
				);
			}

			for (const slot of item.time_slots) {
				if (slot.start_time >= slot.end_time) {
					throw new AppError(
						"start_time must be less than end_time",
						"INVALID_TIME_SLOT",
						400,
					);
				}
			}
		}
	}

	private sortBusinessHours(data: BusinessHour[]): BusinessHour[] {
		return data.sort(
			(a, b) => DAY_ORDER[a.day_of_week] - DAY_ORDER[b.day_of_week],
		);
	}
}
