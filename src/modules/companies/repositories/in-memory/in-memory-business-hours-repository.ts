import { randomUUID } from "node:crypto";
import type {
	BusinessHour,
	BusinessHourTimeSlot,
	BusinessHourUpsertInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { BusinessHoursRepository } from "../business-hours-repository.js";

type StoredBusinessHour = {
	id: string;
	company_id: string;
	day_of_week: BusinessHour["day_of_week"];
	is_open: boolean;
	created_at: Date;
	updated_at: Date;
};

type StoredBusinessHourTimeSlot = {
	id: string;
	business_hour_id: string;
	start_time: string;
	end_time: string;
	created_at: Date;
	updated_at: Date;
};

export class InMemoryBusinessHoursRepository
	implements BusinessHoursRepository
{
	public businessHours: StoredBusinessHour[] = [];
	public timeSlots: StoredBusinessHourTimeSlot[] = [];

	async findByCompanyId(companyId: string) {
		const hours = this.businessHours.filter(
			(item) => item.company_id === companyId,
		);

		return hours.map((hour) => {
			const timeSlots = this.timeSlots
				.filter((slot) => slot.business_hour_id === hour.id)
				.map(
					(slot) =>
						({
							id: slot.id,
							start_time: slot.start_time,
							end_time: slot.end_time,
						}) satisfies BusinessHourTimeSlot,
				);

			return {
				id: hour.id,
				day_of_week: hour.day_of_week,
				is_open: hour.is_open,
				time_slots: timeSlots,
			} satisfies BusinessHour;
		});
	}

	async upsertMany(companyId: string, data: BusinessHourUpsertInput[]) {
		for (const item of data) {
			const now = new Date();
			const current = this.businessHours.find(
				(hour) =>
					hour.company_id === companyId &&
					hour.day_of_week === item.day_of_week,
			);

			if (current) {
				current.is_open = item.is_open;
				current.updated_at = now;
			} else {
				this.businessHours.push({
					id: randomUUID(),
					company_id: companyId,
					day_of_week: item.day_of_week,
					is_open: item.is_open,
					created_at: now,
					updated_at: now,
				});
			}

			const persisted = this.businessHours.find(
				(hour) =>
					hour.company_id === companyId &&
					hour.day_of_week === item.day_of_week,
			);

			if (!persisted) {
				continue;
			}

			this.timeSlots = this.timeSlots.filter(
				(slot) => slot.business_hour_id !== persisted.id,
			);

			for (const slot of item.time_slots) {
				this.timeSlots.push({
					id: randomUUID(),
					business_hour_id: persisted.id,
					start_time: slot.start_time,
					end_time: slot.end_time,
					created_at: now,
					updated_at: now,
				});
			}
		}

		return this.findByCompanyId(companyId);
	}
}
