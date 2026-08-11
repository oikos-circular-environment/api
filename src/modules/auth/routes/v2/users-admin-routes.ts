import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { appErrorSchema } from "@/modules/common/errors/app-error.js";
import { requireRole } from "@/modules/common/middlewares/require-role.js";
import { createVerifySession } from "@/modules/common/middlewares/verify-session.js";
import { withBearerAuth } from "@/modules/common/types/openapi-security.js";
import { authV2UserSchema } from "../../dtos/auth-v2-dto.js";
import {
	banUserAdminBodySchema,
	createUserAdminBodySchema,
	listUserSessionsAdminResponseSchema,
	listUsersAdminQuerySchema,
	listUsersAdminResponseSchema,
	resetPasswordAdminBodySchema,
	setRoleAdminBodySchema,
	userAdminParamsSchema,
} from "../../dtos/users-admin-dto.js";
import type {
	AuthSession,
	AuthUser,
} from "../../providers/auth/auth-provider.js";
import { auth } from "../../providers/auth/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "../../providers/auth/better-auth/better-auth-auth-provider.js";
import { BanUserUseCase } from "../../use-cases/v2/admin/ban-user-use-case.js";
import { CreateUserUseCase } from "../../use-cases/v2/admin/create-user-use-case.js";
import { GetUserUseCase } from "../../use-cases/v2/admin/get-user-use-case.js";
import { ListUserSessionsUseCase } from "../../use-cases/v2/admin/list-user-sessions-use-case.js";
import { ListUsersUseCase } from "../../use-cases/v2/admin/list-users-use-case.js";
import { RemoveUserUseCase } from "../../use-cases/v2/admin/remove-user-use-case.js";
import { ResetUserPasswordUseCase } from "../../use-cases/v2/admin/reset-user-password-use-case.js";
import { RevokeUserSessionsUseCase } from "../../use-cases/v2/admin/revoke-user-sessions-use-case.js";
import { SetUserRoleUseCase } from "../../use-cases/v2/admin/set-user-role-use-case.js";
import { UnbanUserUseCase } from "../../use-cases/v2/admin/unban-user-use-case.js";

const USERS_ADMIN_TAG = "Users Admin";

function buildHeaders(request: FastifyRequest): Headers {
	return new Headers(request.headers as Record<string, string>);
}

function mapAuthUserToResponse(user: AuthUser) {
	return {
		id: user.id,
		email: user.email,
		name: user.name,
		emailVerified: user.emailVerified,
		image: user.image,
		role: user.role,
		banned: user.banned,
		banReason: user.banReason,
		banExpires: user.banExpires?.toISOString() ?? null,
		createdAt: user.createdAt.toISOString(),
		updatedAt: user.updatedAt.toISOString(),
	};
}

function mapAuthSessionToResponse(session: AuthSession) {
	return {
		id: session.id,
		token: session.token,
		expiresAt: session.expiresAt.toISOString(),
		userId: session.userId,
		impersonatedBy: session.impersonatedBy ?? null,
	};
}

export async function usersAdminRoutes(app: FastifyInstance): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const authProvider = makeBetterAuthAuthProvider(auth);
	const verifySession = createVerifySession(authProvider);
	const requireAdmin = requireRole("admin");

	const listUsersUseCase = new ListUsersUseCase(authProvider);
	const getUserUseCase = new GetUserUseCase(authProvider);
	const createUserUseCase = new CreateUserUseCase(authProvider);
	const setUserRoleUseCase = new SetUserRoleUseCase(authProvider);
	const banUserUseCase = new BanUserUseCase(authProvider);
	const unbanUserUseCase = new UnbanUserUseCase(authProvider);
	const listUserSessionsUseCase = new ListUserSessionsUseCase(authProvider);
	const revokeUserSessionsUseCase = new RevokeUserSessionsUseCase(authProvider);
	const resetUserPasswordUseCase = new ResetUserPasswordUseCase(authProvider);
	const removeUserUseCase = new RemoveUserUseCase(authProvider);

	typedApp.get(
		"/users",
		{
			preHandler: [verifySession, requireAdmin],
			schema: withBearerAuth({
				tags: [USERS_ADMIN_TAG],
				summary: "List users",
				description: "Lists users with search, filter, sort and pagination.",
				querystring: listUsersAdminQuerySchema,
				response: {
					200: listUsersAdminResponseSchema,
					401: appErrorSchema,
					403: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const result = await listUsersUseCase.execute(
				request.query,
				buildHeaders(request),
			);
			return reply.send({
				users: result.users.map(mapAuthUserToResponse),
				total: result.total,
				limit: result.limit,
				offset: result.offset,
			});
		},
	);

	typedApp.get(
		"/users/:id",
		{
			preHandler: [verifySession, requireAdmin],
			schema: withBearerAuth({
				tags: [USERS_ADMIN_TAG],
				summary: "Get user by id",
				params: userAdminParamsSchema,
				response: {
					200: z.object({ user: authV2UserSchema }),
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = await getUserUseCase.execute(
				request.params.id,
				buildHeaders(request),
			);
			return reply.send({ user: mapAuthUserToResponse(user) });
		},
	);

	typedApp.post(
		"/users",
		{
			preHandler: [verifySession, requireAdmin],
			schema: withBearerAuth({
				tags: [USERS_ADMIN_TAG],
				summary: "Create user",
				body: createUserAdminBodySchema,
				response: {
					201: z.object({ user: z.any() }),
					400: appErrorSchema,
					401: appErrorSchema,
					403: appErrorSchema,
					409: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = await createUserUseCase.execute(
				request.body,
				buildHeaders(request),
			);
			return reply.status(201).send({ user: mapAuthUserToResponse(user) });
		},
	);

	typedApp.patch(
		"/users/:id/role",
		{
			preHandler: [verifySession, requireAdmin],
			schema: withBearerAuth({
				tags: [USERS_ADMIN_TAG],
				summary: "Set user role",
				description: "Changes the role of a user.",
				params: userAdminParamsSchema,
				body: setRoleAdminBodySchema,
				response: {
					200: z.object({ user: authV2UserSchema }),
					400: appErrorSchema,
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = await setUserRoleUseCase.execute(
				{ userId: request.params.id, role: request.body.role },
				buildHeaders(request),
			);
			return reply.send({ user: mapAuthUserToResponse(user) });
		},
	);

	typedApp.post(
		"/users/:id/ban",
		{
			preHandler: [verifySession, requireAdmin],
			schema: withBearerAuth({
				tags: [USERS_ADMIN_TAG],
				summary: "Ban user",
				description: "Bans a user and revokes their sessions.",
				params: userAdminParamsSchema,
				body: banUserAdminBodySchema,
				response: {
					200: z.object({ user: authV2UserSchema }),
					400: appErrorSchema,
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
					409: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = await banUserUseCase.execute(
				{
					userId: request.params.id,
					banReason: request.body.banReason,
					banExpiresIn: request.body.banExpiresIn,
				},
				buildHeaders(request),
			);
			return reply.send({ user: mapAuthUserToResponse(user) });
		},
	);

	typedApp.post(
		"/users/:id/unban",
		{
			preHandler: [verifySession, requireAdmin],
			schema: withBearerAuth({
				tags: [USERS_ADMIN_TAG],
				summary: "Unban user",
				description: "Removes the ban from a user.",
				params: userAdminParamsSchema,
				response: {
					200: z.object({ user: authV2UserSchema }),
					400: appErrorSchema,
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
					409: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = await unbanUserUseCase.execute(
				request.params.id,
				buildHeaders(request),
			);
			return reply.send({ user: mapAuthUserToResponse(user) });
		},
	);

	typedApp.get(
		"/users/:id/sessions",
		{
			preHandler: [verifySession, requireAdmin],
			schema: withBearerAuth({
				tags: [USERS_ADMIN_TAG],
				summary: "List user sessions",
				params: userAdminParamsSchema,
				response: {
					200: listUserSessionsAdminResponseSchema,
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const sessions = await listUserSessionsUseCase.execute(
				request.params.id,
				buildHeaders(request),
			);
			return reply.send({
				sessions: sessions.map(mapAuthSessionToResponse),
			});
		},
	);

	typedApp.post(
		"/users/:id/revoke-sessions",
		{
			preHandler: [verifySession, requireAdmin],
			schema: withBearerAuth({
				tags: [USERS_ADMIN_TAG],
				summary: "Revoke user sessions",
				description: "Revokes all sessions for a user.",
				params: userAdminParamsSchema,
				response: {
					204: z.void(),
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			await revokeUserSessionsUseCase.execute(
				request.params.id,
				buildHeaders(request),
			);
			return reply.status(204).send();
		},
	);

	typedApp.post(
		"/users/:id/reset-password",
		{
			preHandler: [verifySession, requireAdmin],
			schema: withBearerAuth({
				tags: [USERS_ADMIN_TAG],
				summary: "Reset user password",
				description: "Hard resets a user's password without the current one.",
				params: userAdminParamsSchema,
				body: resetPasswordAdminBodySchema,
				response: {
					204: z.void(),
					400: appErrorSchema,
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			await resetUserPasswordUseCase.execute(
				{
					userId: request.params.id,
					newPassword: request.body.newPassword,
				},
				buildHeaders(request),
			);
			return reply.status(204).send();
		},
	);

	typedApp.delete(
		"/users/:id",
		{
			preHandler: [verifySession, requireAdmin],
			schema: withBearerAuth({
				tags: [USERS_ADMIN_TAG],
				summary: "Delete user",
				description: "Permanently removes a user and their sessions.",
				params: userAdminParamsSchema,
				response: {
					204: z.void(),
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			await removeUserUseCase.execute(request.params.id, buildHeaders(request));
			return reply.status(204).send();
		},
	);
}
