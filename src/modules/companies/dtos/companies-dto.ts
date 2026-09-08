import z from "zod";
import { companyAddressSchema } from "../entities/address-entity.js";
import {
	businessHourSchema,
	companyBusinessHoursSchema,
} from "../entities/business-hour-entity.js";
import { companySchema } from "../entities/company-entity.js";
import {
	companyServiceSchema,
	companyServicesSchema,
} from "../entities/company-service-entity.js";
import {
	companyWasteSchema,
	companyWastesSchema,
} from "../entities/company-waste-entity.js";
import { dayOfWeekSchema } from "../entities/enums.js";

export type { CompanyAddress } from "../entities/address-entity.js";
export { companyAddressSchema } from "../entities/address-entity.js";
export type {
	BusinessHour,
	BusinessHourTimeSlot,
} from "../entities/business-hour-entity.js";
export {
	businessHourSchema,
	businessHourTimeSlotSchema,
	companyBusinessHoursSchema,
} from "../entities/business-hour-entity.js";
export type { Company } from "../entities/company-entity.js";
export { companySchema } from "../entities/company-entity.js";
export type { CompanyService } from "../entities/company-service-entity.js";
export {
	companyServiceSchema,
	companyServicesSchema,
} from "../entities/company-service-entity.js";
export type {
	CompanyValidation,
	CompanyValidationField,
} from "../entities/company-validation-entity.js";
export { companyValidationSchema } from "../entities/company-validation-entity.js";
export type { CompanyWaste } from "../entities/company-waste-entity.js";
export {
	companyWasteSchema,
	companyWastesSchema,
} from "../entities/company-waste-entity.js";
export type {
	CompanyType,
	DayOfWeek,
	IdentityType,
	Measurement,
} from "../entities/enums.js";
export {
	companyTypeSchema,
	dayOfWeekSchema,
	identityTypeSchema,
	measurementSchema,
} from "../entities/enums.js";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const businessHourTimeSlotInputSchema = z.object({
	start_time: z
		.string()
		.regex(timePattern, "start_time must be in HH:mm format"),
	end_time: z.string().regex(timePattern, "end_time must be in HH:mm format"),
});
export type BusinessHourTimeSlotInput = z.infer<
	typeof businessHourTimeSlotInputSchema
>;

export const businessHourUpsertInputSchema = z.object({
	day_of_week: dayOfWeekSchema,
	is_open: z.boolean(),
	time_slots: z.array(businessHourTimeSlotInputSchema),
});
export type BusinessHourUpsertInput = z.infer<
	typeof businessHourUpsertInputSchema
>;

export const upsertCompanyBusinessHoursSchema = z
	.object({
		business_hours: z.array(businessHourUpsertInputSchema).min(1),
	})
	.refine(
		(data) => {
			const uniqueDays = new Set(
				data.business_hours.map((item) => item.day_of_week),
			);
			return uniqueDays.size === data.business_hours.length;
		},
		{
			message: "day_of_week must be unique",
			path: ["business_hours"],
		},
	);
export type UpsertCompanyBusinessHours = z.infer<
	typeof upsertCompanyBusinessHoursSchema
>;

export const createCompanySchema = companySchema.omit({
	id: true,
	is_company_valid: true,
	avatar: true,
	created_at: true,
	updated_at: true,
});
export type CreateCompany = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema
	.omit({ user_id: true })
	.partial();
export type UpdateCompany = z.infer<typeof updateCompanySchema>;

export const createCompanyAddressSchema = companyAddressSchema
	.omit({ id: true, created_at: true, updated_at: true })
	.extend({ company_id: z.uuid() });
export type CreateCompanyAddress = z.infer<typeof createCompanyAddressSchema>;

export const upsertCompanyAddressSchema = createCompanyAddressSchema.omit({
	company_id: true,
});
export type UpsertCompanyAddress = z.infer<typeof upsertCompanyAddressSchema>;

export const updateCompanyAddressSchema = upsertCompanyAddressSchema.partial();
export type UpdateCompanyAddress = z.infer<typeof updateCompanyAddressSchema>;

export const companyWasteInputSchema = companyWasteSchema.omit({
	id: true,
	waste_category: true,
	created_at: true,
	updated_at: true,
});
export type CompanyWasteInput = z.infer<typeof companyWasteInputSchema>;

export const upsertCompanyWastesSchema = z.object({
	wastes: z.array(companyWasteInputSchema),
});
export type UpsertCompanyWastes = z.infer<typeof upsertCompanyWastesSchema>;

export const companyServiceInputSchema = companyServiceSchema.omit({
	id: true,
	waste_category: true,
	created_at: true,
	updated_at: true,
});
export type CompanyServiceInput = z.infer<typeof companyServiceInputSchema>;

export const upsertCompanyServicesSchema = z.object({
	services: z.array(companyServiceInputSchema),
});
export type UpsertCompanyServices = z.infer<typeof upsertCompanyServicesSchema>;

export const companyGeneralRegistrationValidationSchema = companySchema.pick({
	identity: true,
	identity_type: true,
	company_type: true,
	business_name: true,
	corporate_name: true,
	phones: true,
	started_activity_in: true,
});

export const companyBusinessHoursValidationSchema = z
	.array(businessHourSchema)
	.refine((hours) => hours.some((h) => h.is_open && h.time_slots.length > 0), {
		message: "At least one open day with a time slot is required",
	});

export const companyWastesValidationSchema = z
	.array(companyWasteSchema)
	.min(1)
	.refine(
		(items) =>
			items.every((i) => z.uuid().safeParse(i.waste_category_id).success),
		{
			message: "All wastes must have a valid waste_category_id",
		},
	);

export const companyServicesValidationSchema = z
	.array(companyServiceSchema)
	.min(1)
	.refine(
		(items) =>
			items.every((i) => z.uuid().safeParse(i.waste_category_id).success),
		{
			message: "All services must have a valid waste_category_id",
		},
	);

export const companyProfileSchema = companySchema.extend({
	address: companyAddressSchema.nullable(),
	business_hours: companyBusinessHoursSchema,
	wastes: companyWastesSchema,
	services: companyServicesSchema,
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
// Registers each schema above as a named OpenAPI component (Models tab in
// Scalar) instead of inlined-per-operation JSON Schema.
z.globalRegistry.add(businessHourTimeSlotInputSchema, {
	id: "CompaniesBusinessHourTimeSlotUpsertInput",
});
z.globalRegistry.add(businessHourUpsertInputSchema, {
	id: "CompaniesBusinessHourUpsertInput",
});
z.globalRegistry.add(companyBusinessHoursValidationSchema, {
	id: "CompaniesCompanyBusinessHoursValidation",
});
z.globalRegistry.add(companyGeneralRegistrationValidationSchema, {
	id: "CompaniesCompanyGeneralRegistrationValidation",
});
z.globalRegistry.add(companyProfileSchema, { id: "CompaniesCompanyProfile" });
z.globalRegistry.add(companyServiceInputSchema, {
	id: "CompaniesCompanyServiceUpsertInput",
});
z.globalRegistry.add(companyServicesValidationSchema, {
	id: "CompaniesCompanyServicesValidation",
});
z.globalRegistry.add(companyWasteInputSchema, {
	id: "CompaniesCompanyWasteUpsertInput",
});
z.globalRegistry.add(companyWastesValidationSchema, {
	id: "CompaniesCompanyWastesValidation",
});
z.globalRegistry.add(createCompanyAddressSchema, {
	id: "CompaniesCreateCompanyAddress",
});
z.globalRegistry.add(createCompanySchema, { id: "CompaniesCreateCompany" });
z.globalRegistry.add(updateCompanyAddressSchema, {
	id: "CompaniesUpdateCompanyAddress",
});
z.globalRegistry.add(updateCompanySchema, { id: "CompaniesUpdateCompany" });
z.globalRegistry.add(upsertCompanyAddressSchema, {
	id: "CompaniesUpsertCompanyAddress",
});
z.globalRegistry.add(upsertCompanyBusinessHoursSchema, {
	id: "CompaniesUpsertCompanyBusinessHours",
});
z.globalRegistry.add(upsertCompanyServicesSchema, {
	id: "CompaniesUpsertCompanyServices",
});
z.globalRegistry.add(upsertCompanyWastesSchema, {
	id: "CompaniesUpsertCompanyWastes",
});
