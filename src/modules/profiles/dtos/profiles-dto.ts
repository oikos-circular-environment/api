import z from "zod";

export const createAddressSchema = z.object({
  profile_id: z.string().uuid(),
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

export type CreateAddress = z.infer<typeof createAddressSchema>;

export const updateAddressSchema = createAddressSchema
  .partial()
  .omit({ profile_id: true });

export type UpdateAddress = z.infer<typeof updateAddressSchema>;

export const createProfileSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().min(1, "Full name is required"),
  display_name: z.string().min(1, "Display name is required"),
  cpf: z.string().min(1, "CPF is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.email("Invalid email address"),
  is_collector: z.boolean().default(false),
});

export type CreateProfile = z.infer<typeof createProfileSchema>;

export const updateProfileSchema = createProfileSchema
  .partial()
  .omit({ user_id: true });

export type UpdateProfile = z.infer<typeof updateProfileSchema>;

export const addressSchema = z.object({
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

export type Address = z.infer<typeof addressSchema>;

export const profileSchema = createProfileSchema.extend({
  id: z.string(),
  created_at: z.date(),
  updated_at: z.date(),
  address: addressSchema.nullable(),
});

export type Profile = z.infer<typeof profileSchema>;
