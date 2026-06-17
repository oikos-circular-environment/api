import type z from "zod";
import { userSchema } from "../entities/user-entity.js";

export const createUserSchema = userSchema.omit({
	id: true,
	created_at: true,
});
export type CreateUser = z.infer<typeof createUserSchema>;

export { userSchema } from "../entities/user-entity.js";
export type { User } from "../entities/user-entity.js";
