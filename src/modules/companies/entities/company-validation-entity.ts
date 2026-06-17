import z from "zod";

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
