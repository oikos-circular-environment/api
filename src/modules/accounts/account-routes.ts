import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { PrismaRefreshTokenRepository } from "../auth/repositories/prisma/refresh-token-repository-prisma.js";
import { appErrorSchema } from "../common/errors/app-error.js";
import { verifyJwt } from "../common/middlewares/verify-jwt.js";
import {
	issueAuthTokens,
	refreshCookieOptions,
} from "../common/services/auth/token-service.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import {
	changePasswordSchema,
	createUserSchema,
	userResponseSchema,
} from "./dtos/accounts-dto.js";
import { BullMQAccountDeletionJobDispatcher } from "./providers/queue/bullmq/bullmq-account-deletion-job-dispatcher.js";
import { PrismaUsersRepository } from "./repositories/prisma/users-repository-prisma.js";
import { CancelAccountDeletionUseCase } from "./use-cases/cancel-account-deletion-use-case.js";
import { ChangePasswordUseCase } from "./use-cases/change-password-use-case.js";
import { GetUserUseCase } from "./use-cases/get-user-use-case.js";
import { RegisterUserUseCase } from "./use-cases/register-user-use-case.js";
import { RequestAccountDeletionUseCase } from "./use-cases/request-account-deletion-use-case.js";

export async function accountRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();

	typedApp.post(
		"/users/register",
		{
			schema: {
				tags: ["Users"],
				summary: "Register a new user",
				description:
					"Creates a new user account with the provided information.",
				body: createUserSchema,
				response: {
					204: z.object(),

					409: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const { email, password } = request.body;
			const usersRepository = new PrismaUsersRepository();
			const registerUserUseCase = new RegisterUserUseCase(usersRepository);
			await registerUserUseCase.execute({
				email,
				password,
			});

			reply.status(204);
		},
	);

	typedApp.register(async (authenticatedApp) => {
		const typedAuth = authenticatedApp.withTypeProvider<ZodTypeProvider>();

		typedAuth.addHook("onRequest", async (request) => {
			await verifyJwt(request);
		});

		typedAuth.get(
			"/users/me",
			{
				schema: withBearerAuth({
					tags: ["Users"],
					summary: "Get authenticated user",
					description: "Returns the authenticated user's account information.",
					response: {
						200: z.object({ user: userResponseSchema }),
						401: appErrorSchema,
						404: appErrorSchema,
					},
				}),
			},
			async (request, reply) => {
				const userId = request.user.sub;
				const usersRepository = new PrismaUsersRepository();
				const useCase = new GetUserUseCase(usersRepository);
				const user = await useCase.execute({ userId });

				return reply.status(200).send({
					user: {
						id: user.id,
						email: user.email,
						created_at: user.created_at,
						deleted_at: user.deleted_at,
					},
				});
			},
		);

		typedAuth.delete(
			"/users/me",
			{
				schema: withBearerAuth({
					tags: ["Users"],
					summary: "Request account deletion",
					description:
						"Schedules the authenticated user's account for deletion after a grace period.",
					response: {
						202: z.object({
							message: z.string(),
							deleted_at: z.string().datetime(),
						}),
						401: appErrorSchema,
						404: appErrorSchema,
						409: appErrorSchema,
					},
				}),
			},
			async (request, reply) => {
				const userId = request.user.sub;
				const usersRepository = new PrismaUsersRepository();
				const jobDispatcher = new BullMQAccountDeletionJobDispatcher();
				const useCase = new RequestAccountDeletionUseCase(
					usersRepository,
					jobDispatcher,
				);

				const user = await useCase.execute({ userId });

				return reply.status(202).send({
					message: "Account scheduled for deletion.",
					deleted_at: user.deleted_at!.toISOString(),
				});
			},
		);

		typedAuth.patch(
			"/users/me/cancel-deletion",
			{
				schema: withBearerAuth({
					tags: ["Users"],
					summary: "Cancel account deletion",
					description: "Cancels a previously scheduled account deletion.",
					response: {
						200: z.object({
							message: z.string(),
						}),
						401: appErrorSchema,
						404: appErrorSchema,
						422: appErrorSchema,
					},
				}),
			},
			async (request, reply) => {
				const userId = request.user.sub;
				const usersRepository = new PrismaUsersRepository();
				const jobDispatcher = new BullMQAccountDeletionJobDispatcher();
				const useCase = new CancelAccountDeletionUseCase(
					usersRepository,
					jobDispatcher,
				);

				await useCase.execute({ userId });

				return reply.status(200).send({
					message: "Account deletion cancelled.",
				});
			},
		);

		typedAuth.patch(
			"/users/me/change-password",
			{
				schema: withBearerAuth({
					tags: ["Users"],
					summary: "Change password",
					description:
						"Changes the authenticated user's password. Revokes every other " +
						"session and returns a fresh token pair for the current device.",
					body: changePasswordSchema,
					response: {
						200: z.object({
							token: z.string(),
							refreshToken: z.string(),
						}),
						401: appErrorSchema,
						404: appErrorSchema,
						422: appErrorSchema,
					},
				}),
			},
			async (request, reply) => {
				const userId = request.user.sub;
				const { current_password, new_password } = request.body;

				const usersRepository = new PrismaUsersRepository();
				const refreshTokenRepository = new PrismaRefreshTokenRepository();
				const useCase = new ChangePasswordUseCase(
					usersRepository,
					refreshTokenRepository,
				);

				const user = await useCase.execute({
					userId,
					currentPassword: current_password,
					newPassword: new_password,
				});

				const { token, refreshToken } = await issueAuthTokens(
					{
						sign: async (payload, options) =>
							reply.jwtSign(payload, { sign: options }),
					},
					refreshTokenRepository,
					user,
				);

				return reply
					.status(200)
					.setCookie("refreshToken", refreshToken, refreshCookieOptions)
					.send({ token, refreshToken });
			},
		);
	});
}
