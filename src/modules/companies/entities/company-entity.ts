import z from "zod";
import { companyTypeSchema, identityTypeSchema } from "./enums.js";

export const companySchema = z.object({
	id: z.string(),
	user_id: z.uuid(),
	organization_id: z.string(),
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
