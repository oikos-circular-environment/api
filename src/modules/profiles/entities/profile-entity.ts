import z from "zod";

export const addressSchema = z.object({
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
	latitude: z.number(),
	longitude: z.number(),
	created_at: z.date(),
	updated_at: z.date(),
});
export type Address = z.infer<typeof addressSchema>;

export const profileImageSchema = z.object({
	id: z.string(),
	url: z.string(),
	file_name: z.string(),
	path: z.string(),
	created_at: z.date(),
});
export type ProfileImage = z.infer<typeof profileImageSchema>;

export const profileSchema = z.object({
	id: z.string(),
	user_id: z.uuid(),
	full_name: z.string(),
	display_name: z.string(),
	phone: z.string(),
	created_at: z.date(),
	updated_at: z.date(),
	address: addressSchema.nullable(),
	profile_image: profileImageSchema.nullable(),
});
export type Profile = z.infer<typeof profileSchema>;
// Registers each schema above as a named OpenAPI component (Models tab in
// Scalar) instead of inlined-per-operation JSON Schema.
z.globalRegistry.add(addressSchema, { id: "ProfilesAddress" });
z.globalRegistry.add(profileImageSchema, { id: "ProfilesProfileImage" });
z.globalRegistry.add(profileSchema, { id: "ProfilesProfile" });
