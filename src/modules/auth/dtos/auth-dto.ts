import z from "zod";

export const authUserSchema = z.object({
	id: z.string(),
	email: z.email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters long"),
});

export type AuthUser = z.infer<typeof authUserSchema>;

export const loginSchema = authUserSchema.pick({
	email: true,
	password: true,
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshBodySchema = z.object({
	refreshToken: z.string().optional(),
});

export type RefreshBodyInput = z.infer<typeof refreshBodySchema>;
