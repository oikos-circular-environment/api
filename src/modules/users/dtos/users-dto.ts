import type z from "zod";
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

export type { User } from "../entities/user-entity.js";
export { userSchema } from "../entities/user-entity.js";
