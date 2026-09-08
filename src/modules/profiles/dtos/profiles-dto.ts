import z from "zod";
import { addressSchema } from "../entities/profile-entity.js";

export const createAddressSchema = addressSchema
	.omit({ id: true, created_at: true, updated_at: true })
	.extend({
		profile_id: z.uuid(),
		zip_code: z.string().min(1, "Zip code is required"),
		street: z.string().min(1, "Street is required"),
		number: z.string().min(1, "Number is required"),
		complement: z.string().optional().nullable(),
		district: z.string().min(1, "District is required"),
		city: z.string().min(1, "City is required"),
		state: z.string().min(1, "State is required"),
		state_code: z.string().length(2, "State code must have 2 characters"),
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
export type SaveProfileImage = z.infer<typeof saveProfileImageSchema>;

export const uploadProfileImageSchema = z.object({
	file: z.string().meta({ format: "binary" }),
});
export type UploadProfileImage = z.infer<typeof uploadProfileImageSchema>;

export type {
	Address,
	Profile,
	ProfileImage,
} from "../entities/profile-entity.js";
export {
	addressSchema,
	profileImageSchema,
	profileSchema,
} from "../entities/profile-entity.js";

// Registers each schema above as a named OpenAPI component (Models tab in
// Scalar) instead of inlined-per-operation JSON Schema.
z.globalRegistry.add(createAddressSchema, { id: "ProfilesCreateAddress" });
z.globalRegistry.add(createProfileSchema, { id: "ProfilesCreateProfile" });
z.globalRegistry.add(saveProfileImageSchema, {
	id: "ProfilesSaveProfileImage",
});
z.globalRegistry.add(updateAddressSchema, { id: "ProfilesUpdateAddress" });
z.globalRegistry.add(updateProfileSchema, { id: "ProfilesUpdateProfile" });
z.globalRegistry.add(uploadProfileImageSchema, {
	id: "ProfilesUploadProfileImage",
});
