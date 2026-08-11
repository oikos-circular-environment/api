import z from "zod";
import { authV2UserSchema } from "./auth-v2-dto.js";

export const listUsersAdminQuerySchema = z.object({
	searchValue: z.string().optional(),
	searchField: z.enum(["email", "name"]).optional(),
	searchOperator: z.enum(["contains", "starts_with", "ends_with"]).optional(),
	limit: z.coerce.number().int().min(1).max(100).optional(),
	offset: z.coerce.number().int().min(0).optional(),
	sortBy: z.string().optional(),
	sortDirection: z.enum(["asc", "desc"]).optional(),
	filterField: z.string().optional(),
	filterValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
	filterOperator: z.string().optional(),
});
export type ListUsersAdminQueryInput = z.infer<
	typeof listUsersAdminQuerySchema
>;

export const listUsersAdminResponseSchema = z.object({
	users: z.array(authV2UserSchema),
	total: z.number().int(),
	limit: z.number().int().optional(),
	offset: z.number().int().optional(),
});
export type ListUsersAdminResponse = z.infer<
	typeof listUsersAdminResponseSchema
>;

export const createUserAdminBodySchema = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.email("Invalid email address"),
	password: z
		.string()
		.min(6, "Password must be at least 6 characters long")
		.optional(),
	role: z.string().min(1, "Role is required").optional(),
});
export type CreateUserAdminBodyInput = z.infer<
	typeof createUserAdminBodySchema
>;

export const setRoleAdminBodySchema = z.object({
	role: z.string().min(1, "Role is required"),
});
export type SetRoleAdminBodyInput = z.infer<typeof setRoleAdminBodySchema>;

export const banUserAdminBodySchema = z.object({
	banReason: z.string().optional(),
	banExpiresIn: z.number().int().min(0).optional(),
});
export type BanUserAdminBodyInput = z.infer<typeof banUserAdminBodySchema>;

export const resetPasswordAdminBodySchema = z.object({
	newPassword: z.string().min(6, "Password must be at least 6 characters long"),
});
export type ResetPasswordAdminBodyInput = z.infer<
	typeof resetPasswordAdminBodySchema
>;

export const userAdminParamsSchema = z.object({
	id: z.string().min(1, "User id is required"),
});
export type UserAdminParamsInput = z.infer<typeof userAdminParamsSchema>;

export const listUserSessionsAdminResponseSchema = z.object({
	sessions: z.array(
		z.object({
			id: z.string(),
			token: z.string(),
			expires_at: z.string().datetime(),
			user_id: z.string(),
			impersonated_by: z.string().nullable().optional(),
		}),
	),
});
export type ListUserSessionsAdminResponse = z.infer<
	typeof listUserSessionsAdminResponseSchema
>;
