import { prisma } from "@/lib/prisma.js";
import type {
	BusinessHour,
	BusinessHourTimeSlot,
	BusinessHourUpsertInput,
} from "@/modules/companies/dtos/companies-dto.js";
import type { BusinessHoursRepository } from "../business-hours-repository.js";

export class PrismaBusinessHoursRepository implements BusinessHoursRepository {
	async findByCompanyId(companyId: string) {
		const businessHours = await prisma.companyBusinessHour.findMany({
			where: {
				company_id: companyId,
			},
			include: {
				time_slots: true,
			},
		});

		return businessHours.map(
			(businessHour) =>
				({
					id: businessHour.id,
					day_of_week: businessHour.day_of_week,
					is_open: businessHour.is_open,
					time_slots: businessHour.time_slots.map(
						(slot) =>
							({
								id: slot.id,
								start_time: slot.start_time,
								end_time: slot.end_time,
							}) satisfies BusinessHourTimeSlot,
					),
				}) satisfies BusinessHour,
		);
	}

	async upsertMany(companyId: string, data: BusinessHourUpsertInput[]) {
		await prisma.$transaction(async (transaction) => {
			for (const item of data) {
				const businessHour = await transaction.companyBusinessHour.upsert({
					where: {
						company_id_day_of_week: {
							company_id: companyId,
							day_of_week: item.day_of_week,
						},
					},
					create: {
						company_id: companyId,
						day_of_week: item.day_of_week,
						is_open: item.is_open,
					},
					update: {
						is_open: item.is_open,
					},
				});

				await transaction.businessHourTimeSlot.deleteMany({
					where: {
						business_hour_id: businessHour.id,
					},
				});

				if (item.time_slots.length > 0) {
					await transaction.businessHourTimeSlot.createMany({
						data: item.time_slots.map((slot) => ({
							business_hour_id: businessHour.id,
							start_time: slot.start_time,
							end_time: slot.end_time,
						})),
					});
				}
			}
		});

		return this.findByCompanyId(companyId);
	}
}
