import z from "zod";

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
