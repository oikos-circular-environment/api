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
// Registers each schema above as a named OpenAPI component (Models tab in
// Scalar) instead of inlined-per-operation JSON Schema.
z.globalRegistry.add(businessHourSchema, { id: "CompaniesBusinessHour" });
z.globalRegistry.add(businessHourTimeSlotSchema, {
	id: "CompaniesBusinessHourTimeSlot",
});
z.globalRegistry.add(companyBusinessHoursSchema, {
	id: "CompaniesCompanyBusinessHours",
});
