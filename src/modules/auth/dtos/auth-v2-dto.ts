import z from "zod";

export const signUpV2Schema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters long"),
});
export type SignUpV2Input = z.infer<typeof signUpV2Schema>;

export const signInV2Schema = z.object({
	email: z.email("Invalid email address"),
	password: z.string().min(1, "Password is required"),
});
export type SignInV2Input = z.infer<typeof signInV2Schema>;

export const authV2UserSchema = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string().nullable(),
	emailVerified: z.boolean(),
	image: z.string().nullable(),
	role: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
});
export type AuthV2UserResponse = z.infer<typeof authV2UserSchema>;

export const signInV2ResponseSchema = z.object({
	token: z.string(),
	user: authV2UserSchema,
});
export type SignInV2Response = z.infer<typeof signInV2ResponseSchema>;

export const sessionV2ResponseSchema = z.object({
	user: authV2UserSchema,
});
export type SessionV2Response = z.infer<typeof sessionV2ResponseSchema>;
