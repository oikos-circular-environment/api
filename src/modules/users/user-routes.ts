import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { auth } from "../auth/providers/auth/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "../auth/providers/auth/better-auth/better-auth-auth-provider.js";
import { appErrorSchema } from "../common/errors/app-error.js";
import { createVerifySession } from "../common/middlewares/verify-session.js";
import { withBearerAuth } from "../common/types/openapi-security.js";
import { userResponseSchema } from "./dtos/users-dto.js";
import { BullMQAccountDeletionJobDispatcher } from "./providers/queue/bullmq/bullmq-account-deletion-job-dispatcher.js";
import { PrismaUsersRepository } from "./repositories/prisma/users-repository-prisma.js";
import { CancelAccountDeletionUseCase } from "./use-cases/cancel-account-deletion-use-case.js";
import { GetUserUseCase } from "./use-cases/get-user-use-case.js";
import { RequestAccountDeletionUseCase } from "./use-cases/request-account-deletion-use-case.js";

export async function userRoutes(app: FastifyInstance) {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const authProvider = makeBetterAuthAuthProvider(auth);
	const verifySession = createVerifySession(authProvider);

	typedApp.register(async (authenticatedApp) => {
		const typedAuth = authenticatedApp.withTypeProvider<ZodTypeProvider>();

		typedAuth.addHook("onRequest", async (request) => {
			await verifySession(request);
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
				const userId = request.authV2User.id;
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
				const userId = request.authV2User.id;
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
				const userId = request.authV2User.id;
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
	});
}
