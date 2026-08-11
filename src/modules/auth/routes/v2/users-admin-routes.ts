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
import type { AuthSession, AuthUser } from "../../providers/auth-provider.js";
import { auth } from "../../providers/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "../../providers/better-auth/better-auth-auth-provider.js";
import { BanUserAdminUseCase } from "../../use-cases/ban-user-admin-use-case.js";
import { CreateUserAdminUseCase } from "../../use-cases/create-user-admin-use-case.js";
import { GetUserAdminUseCase } from "../../use-cases/get-user-admin-use-case.js";
import { ListUserSessionsAdminUseCase } from "../../use-cases/list-user-sessions-admin-use-case.js";
import { ListUsersAdminUseCase } from "../../use-cases/list-users-admin-use-case.js";
import { RemoveUserAdminUseCase } from "../../use-cases/remove-user-admin-use-case.js";
import { ResetUserPasswordAdminUseCase } from "../../use-cases/reset-user-password-admin-use-case.js";
import { RevokeUserSessionsAdminUseCase } from "../../use-cases/revoke-user-sessions-admin-use-case.js";
import { SetUserRoleAdminUseCase } from "../../use-cases/set-user-role-admin-use-case.js";
import { UnbanUserAdminUseCase } from "../../use-cases/unban-user-admin-use-case.js";

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

	const listUsersUseCase = new ListUsersAdminUseCase(authProvider);
	const getUserUseCase = new GetUserAdminUseCase(authProvider);
	const createUserUseCase = new CreateUserAdminUseCase(authProvider);
	const setUserRoleUseCase = new SetUserRoleAdminUseCase(authProvider);
	const banUserUseCase = new BanUserAdminUseCase(authProvider);
	const unbanUserUseCase = new UnbanUserAdminUseCase(authProvider);
	const listUserSessionsUseCase = new ListUserSessionsAdminUseCase(
		authProvider,
	);
	const revokeUserSessionsUseCase = new RevokeUserSessionsAdminUseCase(
		authProvider,
	);
	const resetUserPasswordUseCase = new ResetUserPasswordAdminUseCase(
		authProvider,
	);
	const removeUserUseCase = new RemoveUserAdminUseCase(authProvider);

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
