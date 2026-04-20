import type {
	BusinessHour,
	BusinessHourUpsertInput,
} from "@/modules/companies/dtos/companies-dto.js";

export interface BusinessHoursRepository {
	findByCompanyId(companyId: string): Promise<BusinessHour[]>;
	upsertMany(
		companyId: string,
		data: BusinessHourUpsertInput[],
	): Promise<BusinessHour[]>;
}
