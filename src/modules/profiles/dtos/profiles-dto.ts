import z from "zod";

export const createAddressSchema = z.object({
	profile_id: z.uuid(),
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
});

export type CreateAddress = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema
	.partial()
	.omit({ profile_id: true });

export type UpdateAddress = z.infer<typeof updateAddressSchema>;

export const createProfileSchema = z.object({
	user_id: z.uuid(),
	full_name: z.string().min(1, "Full name is required"),
	display_name: z.string().min(1, "Display name is required"),
	phone: z.string().min(1, "Phone is required"),
});

export type CreateProfile = z.infer<typeof createProfileSchema>;

export const updateProfileSchema = createProfileSchema
	.partial()
	.omit({ user_id: true });

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

export const saveProfileImageSchema = z.object({
	url: z.string().url(),
	file_name: z.string().min(1, "File name is required"),
	path: z.string().min(1, "Path is required"),
});

export const uploadProfileImageSchema = z.object({
	file: z.string().meta({ format: "binary" }),
});

export type UploadProfileImage = z.infer<typeof uploadProfileImageSchema>;

export type SaveProfileImage = z.infer<typeof saveProfileImageSchema>;

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

export const profileSchema = createProfileSchema.extend({
	id: z.string(),
	created_at: z.date(),
	updated_at: z.date(),
	address: addressSchema.nullable(),
	profile_image: profileImageSchema.nullable(),
});

export type Profile = z.infer<typeof profileSchema>;
