import z from "zod";
import { wasteCategorySchema } from "@/modules/wastes/dtos/wastes-dto.js";

export const identityTypeSchema = z.enum(["CPF", "CNPJ"]);
export type IdentityType = z.infer<typeof identityTypeSchema>;

export const companyTypeSchema = z.enum([
	"ONG",
	"COMPANY",
	"GOVERNMENT",
	"COLLECTOR",
]);
export type CompanyType = z.infer<typeof companyTypeSchema>;

// --- Company ---

export const companySchema = z.object({
	id: z.string(),
	user_id: z.uuid(),
	identity: z.string().min(1, "Identity is required"),
	identity_type: identityTypeSchema,
	company_type: companyTypeSchema,
	status: z.boolean().default(true),
	business_name: z.string().min(1, "Business name is required"),
	corporate_name: z.string().min(1, "Corporate name is required"),
	email: z.email("Invalid email address").optional().nullable(),
	phones: z
		.array(z.string().min(1, "Phone is required"))
		.min(1, "At least one phone is required"),
	started_activity_in: z.coerce.date(),
	is_company_valid: z.boolean(),
	avatar: z
		.object({
			id: z.string(),
			url: z.string(),
			file_name: z.string(),
			path: z.string(),
			created_at: z.date(),
		})
		.nullable(),
	created_at: z.date(),
	updated_at: z.date(),
});
export type Company = z.infer<typeof companySchema>;

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

// --- Company Address ---

export const companyAddressSchema = z.object({
	id: z.string(),
	zip_code: z.string().min(1, "Zip code is required"),
	street: z.string().min(1, "Street is required"),
	number: z.string().min(1, "Number is required"),
	complement: z.string().optional().nullable(),
	district: z.string().min(1, "District is required"),
	city_ibge_id: z.number().int(),
	city: z.string().min(1, "City is required"),
	state_ibge_id: z.number().int(),
	state: z.string().min(1, "State is required"),
	state_code: z.string().length(2, "State code must have 2 characters"),
	latitude: z.number(),
	longitude: z.number(),
	created_at: z.date(),
	updated_at: z.date(),
});
export type CompanyAddress = z.infer<typeof companyAddressSchema>;

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

// --- Business Hours ---

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const dayOfWeekSchema = z.enum([
	"SUNDAY",
	"MONDAY",
	"TUESDAY",
	"WEDNESDAY",
	"THURSDAY",
	"FRIDAY",
	"SATURDAY",
]);
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

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

// --- Measurement ---

export const measurementSchema = z.enum([
	"KG",
	"L",
	"UNIT",
	"M",
	"M2",
	"M3",
	"ML",
]);
export type Measurement = z.infer<typeof measurementSchema>;

// --- Company Waste ---

export const companyWasteSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Name is required"),
	description: z.string().optional().nullable(),
	price: z.number().nonnegative("Price must be non-negative"),
	unit: measurementSchema,
	waste_category_id: z.string().uuid("waste_category_id must be a valid UUID"),
	waste_category: wasteCategorySchema,
	quantity: z.number().positive("Quantity must be greater than zero"),
	observations: z.string().optional().nullable(),
	created_at: z.date(),
	updated_at: z.date(),
});
export type CompanyWaste = z.infer<typeof companyWasteSchema>;

export const companyWasteInputSchema = companyWasteSchema.omit({
	id: true,
	waste_category: true,
	created_at: true,
	updated_at: true,
});
export type CompanyWasteInput = z.infer<typeof companyWasteInputSchema>;

export const companyWastesSchema = z.array(companyWasteSchema);

export const upsertCompanyWastesSchema = z.object({
	wastes: z.array(companyWasteInputSchema),
});
export type UpsertCompanyWastes = z.infer<typeof upsertCompanyWastesSchema>;

// --- Company Service ---

export const companyServiceSchema = z.object({
	id: z.string(),
	name: z.string().min(1, "Name is required"),
	description: z.string().optional().nullable(),
	price: z.number().nonnegative("Price must be non-negative"),
	unit: measurementSchema,
	waste_category_id: z.string().uuid("waste_category_id must be a valid UUID"),
	waste_category: wasteCategorySchema,
	quantity: z.number().positive("Quantity must be greater than zero"),
	observations: z.string().optional().nullable(),
	created_at: z.date(),
	updated_at: z.date(),
});
export type CompanyService = z.infer<typeof companyServiceSchema>;

export const companyServiceInputSchema = companyServiceSchema.omit({
	id: true,
	waste_category: true,
	created_at: true,
	updated_at: true,
});
export type CompanyServiceInput = z.infer<typeof companyServiceInputSchema>;

export const companyServicesSchema = z.array(companyServiceSchema);

export const upsertCompanyServicesSchema = z.object({
	services: z.array(companyServiceInputSchema),
});
export type UpsertCompanyServices = z.infer<typeof upsertCompanyServicesSchema>;

// --- Validation types and schemas ---

export type CompanyValidationField =
	| "general_registration"
	| "address"
	| "business_hours"
	| "wastes"
	| "services";

export const companyValidationSchema = z.object({
	id: z.string(),
	company_id: z.string(),
	general_registration: z.boolean(),
	address: z.boolean(),
	business_hours: z.boolean(),
	wastes: z.boolean(),
	services: z.boolean(),
});
export type CompanyValidation = z.infer<typeof companyValidationSchema>;

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
			items.every(
				(i) => z.string().uuid().safeParse(i.waste_category_id).success,
			),
		{
			message: "All wastes must have a valid waste_category_id",
		},
	);

export const companyServicesValidationSchema = z
	.array(companyServiceSchema)
	.min(1)
	.refine(
		(items) =>
			items.every(
				(i) => z.string().uuid().safeParse(i.waste_category_id).success,
			),
		{
			message: "All services must have a valid waste_category_id",
		},
	);

// --- Company profile (full aggregate) ---

export const companyProfileSchema = companySchema.extend({
	address: companyAddressSchema.nullable(),
	business_hours: companyBusinessHoursSchema,
	wastes: companyWastesSchema,
	services: companyServicesSchema,
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
