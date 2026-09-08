import z from "zod";
import { authUserSchema } from "@/modules/auth/dtos/auth-user-dto.js";
import { profileSchema } from "@/modules/profiles/dtos/profiles-dto.js";

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
	users: z.array(authUserSchema),
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
	ban_reason: z.string().optional(),
	ban_expires_in: z.number().int().min(0).optional(),
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

export const accountSummarySchema = z.object({
	id: z.string(),
	provider_id: z.string(),
	account_id: z.string(),
	scope: z.string().nullable(),
	created_at: z.string().datetime(),
	updated_at: z.string().datetime(),
});
export type AccountSummaryResponse = z.infer<typeof accountSummarySchema>;

export const getUserAdminResponseSchema = z.object({
	user: authUserSchema,
	profile: profileSchema.nullable(),
	accounts: z.array(accountSummarySchema),
});
export type GetUserAdminResponse = z.infer<typeof getUserAdminResponseSchema>;

export const listUserSessionsAdminResponseSchema = z.object({
	sessions: z.array(
		z.object({
			id: z.string(),
			token: z.string(),
			expires_at: z.string().datetime(),
			user_id: z.string(),
			impersonated_by: z.string().nullable().optional(),
			ip_address: z.string().nullable(),
			user_agent: z.string().nullable(),
		}),
	),
});
export type ListUserSessionsAdminResponse = z.infer<
	typeof listUserSessionsAdminResponseSchema
>;
// Registers each schema above as a named OpenAPI component (Models tab in
// Scalar) instead of inlined-per-operation JSON Schema.
z.globalRegistry.add(accountSummarySchema, {
	id: "ModerationSubModulesUsersAccountSummary",
});
z.globalRegistry.add(banUserAdminBodySchema, {
	id: "ModerationSubModulesUsersBanUserAdminBody",
});
z.globalRegistry.add(createUserAdminBodySchema, {
	id: "ModerationSubModulesUsersCreateUserAdminBody",
});
z.globalRegistry.add(getUserAdminResponseSchema, {
	id: "ModerationSubModulesUsersGetUserAdminResponse",
});
z.globalRegistry.add(listUserSessionsAdminResponseSchema, {
	id: "ModerationSubModulesUsersListUserSessionsAdminResponse",
});
z.globalRegistry.add(listUsersAdminResponseSchema, {
	id: "ModerationSubModulesUsersListUsersAdminResponse",
});
z.globalRegistry.add(resetPasswordAdminBodySchema, {
	id: "ModerationSubModulesUsersResetPasswordAdminBody",
});
z.globalRegistry.add(setRoleAdminBodySchema, {
	id: "ModerationSubModulesUsersSetRoleAdminBody",
});
