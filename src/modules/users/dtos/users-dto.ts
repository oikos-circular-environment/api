import z from "zod";
import { userSchema } from "../entities/user-entity.js";

export const createUserSchema = userSchema.omit({
	id: true,
	created_at: true,
	deleted_at: true,
	deletion_job_id: true,
});
export type CreateUser = z.infer<typeof createUserSchema>;

export const userResponseSchema = userSchema.omit({
	password: true,
	deletion_job_id: true,
});

export const changePasswordSchema = z.object({
	current_password: userSchema.shape.password,
	new_password: userSchema.shape.password,
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export type { User } from "../entities/user-entity.js";
export { userSchema } from "../entities/user-entity.js";
