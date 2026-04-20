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

export const createCompanySchema = z.object({
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
});

export type CreateCompany = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema
	.partial()
	.omit({ user_id: true });

export type UpdateCompany = z.infer<typeof updateCompanySchema>;

export const companySchema = createCompanySchema.extend({
	id: z.string(),
	created_at: z.date(),
	updated_at: z.date(),
});

export type Company = z.infer<typeof companySchema>;

export const createCompanyAddressSchema = z.object({
	company_id: z.string().uuid(),
	zip_code: z.string().min(1, "Zip code is required"),
	street: z.string().min(1, "Street is required"),
	number: z.string().min(1, "Number is required"),
	complement: z.string().optional().nullable(),
	district: z.string().min(1, "District is required"),
	city: z.string().min(1, "City is required"),
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

export const companyAddressSchema = z.object({
	id: z.string(),
	zip_code: z.string(),
	street: z.string(),
	number: z.string(),
	complement: z.string().nullable(),
	district: z.string(),
	city: z.string(),
	state: z.string(),
	state_code: z.string(),
	latitude: z.number().nullable(),
	longitude: z.number().nullable(),
	created_at: z.date(),
	updated_at: z.date(),
});

export type CompanyAddress = z.infer<typeof companyAddressSchema>;
