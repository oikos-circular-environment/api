import z from "zod";

export const userSchema = z.object({
	id: z.string(),
	email: z.email("Invalid email address"),
	password: z.string().min(6, "Password must be at least 6 characters long"),
	created_at: z.date(),
});

export type User = z.infer<typeof userSchema>;

export const createUserSchema = userSchema.omit({
	id: true,
	created_at: true,
});

export type CreateUser = z.infer<typeof createUserSchema>;
