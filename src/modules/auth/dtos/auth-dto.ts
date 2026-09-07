import type z from "zod";
import { authUserSchema } from "../entities/auth-entity.js";

export const loginSchema = authUserSchema.pick({
	email: true,
	password: true,
});
export type LoginInput = z.infer<typeof loginSchema>;

export type { AuthUser } from "../entities/auth-entity.js";
export { authUserSchema } from "../entities/auth-entity.js";
