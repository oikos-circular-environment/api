import z from "zod";

export const passwordFieldSchema = z
	.string()
	.min(6, "Password must be at least 6 characters long");

export const userSchema = z.object({
	id: z.string(),
	email: z.email("Invalid email address"),
	password: passwordFieldSchema.nullable(),
	created_at: z.date(),
	deleted_at: z.date().nullable(),
	deletion_job_id: z.string().nullable(),
});
export type User = z.infer<typeof userSchema>;
