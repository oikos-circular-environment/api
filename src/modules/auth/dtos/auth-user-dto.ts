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

export const authOrganizationSchema = z.object({
	id: z.string(),
	company_id: z.string().nullable(),
	name: z.string(),
	role: z.string(),
});
export type AuthOrganization = z.infer<typeof authOrganizationSchema>;

export const authUserSchema = z.object({
	id: z.string(),
	email: z.string(),
	name: z.string().nullable(),
	email_verified: z.boolean(),
	image: z.string().nullable(),
	role: z.string(),
	banned: z.boolean(),
	ban_reason: z.string().nullable(),
	ban_expires: z.string().datetime().nullable(),
	auth_source: z.string(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
	// Only /auth/sign-in/email and /auth/get-session populate this — moderation reuses the schema without it.
	organizations: z.array(authOrganizationSchema).optional(),
});
export type AuthUserResponse = z.infer<typeof authUserSchema>;

export const signInV2ResponseSchema = z.object({
	token: z.string(),
	user: authUserSchema,
});
export type SignInV2Response = z.infer<typeof signInV2ResponseSchema>;

export const changePasswordV2Schema = z.object({
	currentPassword: z.string().min(1, "Current password is required"),
	newPassword: z.string().min(6, "Password must be at least 6 characters long"),
});
export type ChangePasswordV2Input = z.infer<typeof changePasswordV2Schema>;

export const forgotPasswordV2Schema = z.object({
	email: z.email("Invalid email address"),
});
export type ForgotPasswordV2Input = z.infer<typeof forgotPasswordV2Schema>;

export const forgotPasswordV2ResponseSchema = z.object({
	message: z.string(),
});
export type ForgotPasswordV2Response = z.infer<
	typeof forgotPasswordV2ResponseSchema
>;

export const resetPasswordV2Schema = z.object({
	token: z.string().min(1, "Token is required"),
	newPassword: z.string().min(6, "Password must be at least 6 characters long"),
});
export type ResetPasswordV2Input = z.infer<typeof resetPasswordV2Schema>;

export const sessionV2ResponseSchema = z.object({
	user: authUserSchema,
});
export type SessionV2Response = z.infer<typeof sessionV2ResponseSchema>;

export const sendVerificationEmailV2Schema = z.object({
	email: z.email("Invalid email address"),
});
export type SendVerificationEmailV2Input = z.infer<
	typeof sendVerificationEmailV2Schema
>;

export const sendVerificationEmailV2ResponseSchema = z.object({
	message: z.string(),
});
export type SendVerificationEmailV2Response = z.infer<
	typeof sendVerificationEmailV2ResponseSchema
>;

export const verifyEmailV2Schema = z.object({
	token: z.string().min(1, "Token is required"),
});
export type VerifyEmailV2Input = z.infer<typeof verifyEmailV2Schema>;

export const verifyEmailV2ResponseSchema = z.object({
	message: z.string(),
});
export type VerifyEmailV2Response = z.infer<typeof verifyEmailV2ResponseSchema>;
