import z from "zod";
import { dayOfWeekSchema } from "./enums.js";

export const businessHourTimeSlotSchema = z.object({
	id: z.string(),
	start_time: z.string(),
	end_time: z.string(),
});
export type BusinessHourTimeSlot = z.infer<typeof businessHourTimeSlotSchema>;

export const businessHourSchema = z.object({
	id: z.string(),
	day_of_week: dayOfWeekSchema,
	is_open: z.boolean(),
	time_slots: z.array(businessHourTimeSlotSchema),
});
export type BusinessHour = z.infer<typeof businessHourSchema>;

export const companyBusinessHoursSchema = z.array(businessHourSchema);
