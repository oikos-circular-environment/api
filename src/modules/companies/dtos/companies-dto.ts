import z from "zod";

export const identityTypeSchema = z.enum(["CPF", "CNPJ"]);
export type IdentityType = z.infer<typeof identityTypeSchema>;

export const companyTypeSchema = z.enum([
	"ONG",
	"COMPANY",
	"GOVERNMENT",
	"COLLECTOR",
]);
export type CompanyType = z.infer<typeof companyTypeSchema>;

export const createCompanyInputSchema = z.object({
	user_id: z.string().uuid(),
	identity: z.string().min(1, "Identity is required"),
	identity_type: identityTypeSchema,
	company_type: companyTypeSchema,
	status: z.boolean().default(true),
	is_headquarters: z.boolean().default(false),
	business_name: z.string().optional().nullable(),
	corporate_name: z.string().min(1, "Corporate name is required"),
	accept_appointments: z.boolean().default(false),
	email: z.email("Invalid email address").optional().nullable(),
	phones: z.array(z.string().min(1, "Phone is required")),
	started_activity_in: z.coerce.date(),
	description: z.string().optional().nullable(),
});

export const createCompanySchema = createCompanyInputSchema.superRefine(
	(data, ctx) => {
		if (data.identity_type === "CPF" && !data.business_name) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "business_name is required for CPF identity type",
				path: ["business_name"],
			});
		}
	},
);

export type CreateCompany = z.infer<typeof createCompanySchema>;

export const updateCompanyInputSchema = createCompanyInputSchema
	.partial()
	.omit({ user_id: true });

export const updateCompanySchema = updateCompanyInputSchema.superRefine(
	(data, ctx) => {
		if (data.identity_type === "CPF" && !data.business_name) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "business_name is required for CPF identity type",
				path: ["business_name"],
			});
		}
	},
);

export type UpdateCompany = z.infer<typeof updateCompanySchema>;

export const companySchema = createCompanyInputSchema.extend({
	id: z.string(),
	description: z.string().nullable(),
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

export const uploadCompanyAvatarSchema = z.object({
	company_id: z.string().uuid(),
});

export type UploadCompanyAvatar = z.infer<typeof uploadCompanyAvatarSchema>;

export const createCompanyAddressSchema = z.object({
	company_id: z.string().uuid(),
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
	latitude: z.number().optional().nullable(),
	longitude: z.number().optional().nullable(),
});

export type CreateCompanyAddress = z.infer<typeof createCompanyAddressSchema>;

export const updateCompanyAddressSchema = createCompanyAddressSchema
	.partial()
	.omit({ company_id: true });

export type UpdateCompanyAddress = z.infer<typeof updateCompanyAddressSchema>;

export const upsertCompanyAddressSchema = createCompanyAddressSchema.omit({
	company_id: true,
});

export type UpsertCompanyAddress = z.infer<typeof upsertCompanyAddressSchema>;

export const companyAddressSchema = z.object({
	id: z.string(),
	zip_code: z.string(),
	street: z.string(),
	number: z.string(),
	complement: z.string().nullable(),
	district: z.string(),
	city_ibge_id: z.number(),
	city: z.string(),
	state_ibge_id: z.number(),
	state: z.string(),
	state_code: z.string(),
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
	created_at: z.date(),
	updated_at: z.date(),
});

export type CompanyAddress = z.infer<typeof companyAddressSchema>;

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

export const wasteTypeSchema = z.enum(["RECYCLABLE", "GARBAGE"]);

export type WasteType = z.infer<typeof wasteTypeSchema>;

const companyItemBaseSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().optional().nullable(),
	price: z.number().nonnegative("Price must be non-negative"),
	unit: measurementSchema,
	waste_type: wasteTypeSchema,
	quantity: z.number().positive("Quantity must be greater than zero"),
	observations: z.string().optional().nullable(),
	sub_items: z.array(z.string().min(1)).optional().nullable(),
});

export const companyWasteInputSchema = companyItemBaseSchema;

export type CompanyWasteInput = z.infer<typeof companyWasteInputSchema>;

export const companyWasteSchema = companyItemBaseSchema.extend({
	id: z.string(),
	sub_items: z.array(z.string()).nullable(),
	created_at: z.date(),
	updated_at: z.date(),
});

export type CompanyWaste = z.infer<typeof companyWasteSchema>;

export const companyWastesSchema = z.array(companyWasteSchema);

export const upsertCompanyWastesSchema = z.object({
	wastes: z.array(companyWasteInputSchema),
});

export type UpsertCompanyWastes = z.infer<typeof upsertCompanyWastesSchema>;

export const companyServiceInputSchema = companyItemBaseSchema;

export type CompanyServiceInput = z.infer<typeof companyServiceInputSchema>;

export const companyServiceSchema = companyServiceInputSchema.extend({
	id: z.string(),
	sub_items: z.array(z.string()).nullable(),
	created_at: z.date(),
	updated_at: z.date(),
});

export type CompanyService = z.infer<typeof companyServiceSchema>;

export const companyServicesSchema = z.array(companyServiceSchema);

export const upsertCompanyServicesSchema = z.object({
	services: z.array(companyServiceInputSchema),
});

export type UpsertCompanyServices = z.infer<typeof upsertCompanyServicesSchema>;
