import { AppError } from "@/modules/common/errors/app-error.js";
import type { BusinessHour } from "@/modules/companies/dtos/companies-dto.js";
import type { BusinessHoursRepository } from "@/modules/companies/repositories/business-hours-repository.js";
import type { CompaniesRepository } from "@/modules/companies/repositories/companies-repository.js";

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

type GetCompanyBusinessHoursUseCaseRequest = {
	userId: string;
};

export class GetCompanyBusinessHoursUseCase {
	constructor(
		private readonly companiesRepository: CompaniesRepository,
		private readonly businessHoursRepository: BusinessHoursRepository,
	) {}

	async execute({
		userId,
	}: GetCompanyBusinessHoursUseCaseRequest): Promise<BusinessHour[]> {
		const company = await this.companiesRepository.findByUserId(userId);

		if (!company) {
			throw new AppError("Company not found", "COMPANY_NOT_FOUND", 404);
		}

		const existing = await this.businessHoursRepository.findByCompanyId(
			company.id,
		);
		const existingByDay = new Map(
			existing.map((item) => [item.day_of_week, item]),
		);
		const normalizedData = ORDERED_DAYS.map((dayOfWeek) => {
			const persisted = existingByDay.get(dayOfWeek);

			if (persisted) {
				return {
					day_of_week: persisted.day_of_week,
					is_open: persisted.is_open,
					time_slots: persisted.time_slots.map((slot) => ({
						start_time: slot.start_time,
						end_time: slot.end_time,
					})),
				};
			}

			return {
				day_of_week: dayOfWeek,
				is_open: false,
				time_slots: [],
			};
		});

		const saved = await this.businessHoursRepository.upsertMany(
			company.id,
			normalizedData,
		);

		return saved.sort(
			(a, b) => DAY_ORDER[a.day_of_week] - DAY_ORDER[b.day_of_week],
		);
	}
}
