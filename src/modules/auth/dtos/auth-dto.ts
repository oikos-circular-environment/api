import z from "zod";
import { authUserSchema } from "../entities/auth-entity.js";

export const loginSchema = authUserSchema.pick({
	email: true,
	password: true,
});
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshBodySchema = z.object({
	refreshToken: z.string().optional(),
});
export type RefreshBodyInput = z.infer<typeof refreshBodySchema>;

export { authUserSchema } from "../entities/auth-entity.js";
export type { AuthUser } from "../entities/auth-entity.js";
