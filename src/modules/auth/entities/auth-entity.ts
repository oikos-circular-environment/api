import z from "zod";

export const authUserSchema = z.object({
	id: z.string(),
	email: z.email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters long"),
});
export type AuthUser = z.infer<typeof authUserSchema>;
