import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { auth } from "@/modules/auth/providers/auth/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "@/modules/auth/providers/auth/better-auth/better-auth-auth-provider.js";
import { appErrorSchema } from "@/modules/common/errors/app-error.js";
import { requireRole } from "@/modules/common/middlewares/require-role.js";
import { createVerifySession } from "@/modules/common/middlewares/verify-session.js";
import { withBearerAuth } from "@/modules/common/types/openapi-security.js";
import { supportSchema } from "@/modules/support/dtos/support-dto.js";
import { PrismaSupportsRepository } from "@/modules/support/repositories/prisma/supports-repository-prisma.js";
import {
	getSupportsQuerySchema,
	moderateSupportBodySchema,
} from "./dtos/moderation-support-dto.js";
import { GetSupportUseCase } from "./use-cases/get-support-use-case.js";
import { GetSupportsUseCase } from "./use-cases/get-supports-use-case.js";
import { ModerateSupportUseCase } from "./use-cases/moderate-support-use-case.js";

const MODERATION_SUPPORT_TAG = "Moderation / Support";

export async function moderationSupportRoutes(
	app: FastifyInstance,
): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const authProvider = makeBetterAuthAuthProvider(auth);
	const verifySession = createVerifySession(authProvider);
	const requireModerator = requireRole("moderator");
	const supportsRepository = new PrismaSupportsRepository();

	const getSupportsUseCase = new GetSupportsUseCase(supportsRepository);
	const getSupportUseCase = new GetSupportUseCase(supportsRepository);
	const moderateSupportUseCase = new ModerateSupportUseCase(supportsRepository);

	typedApp.get(
		"/moderation/support",
		{
			preHandler: [verifySession, requireModerator],
			schema: withBearerAuth({
				tags: [MODERATION_SUPPORT_TAG],
				summary: "List support requests",
				description:
					"Lists all support requests with optional filters (status, severity, type) and cursor-based pagination.",
				querystring: getSupportsQuerySchema,
				response: {
					200: z.object({ supports: z.array(supportSchema) }),
					401: appErrorSchema,
					403: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const result = await getSupportsUseCase.execute(request.query);
			return reply.send({ supports: result.supports });
		},
	);

	typedApp.get(
		"/moderation/support/:id",
		{
			preHandler: [verifySession, requireModerator],
			schema: withBearerAuth({
				tags: [MODERATION_SUPPORT_TAG],
				summary: "Get support by id",
				params: z.object({ id: z.string() }),
				response: {
					200: z.object({ support: supportSchema }),
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const result = await getSupportUseCase.execute({
				supportId: request.params.id,
			});
			return reply.send({ support: result.support });
		},
	);

	typedApp.patch(
		"/moderation/support/:id",
		{
			preHandler: [verifySession, requireModerator],
			schema: withBearerAuth({
				tags: [MODERATION_SUPPORT_TAG],
				summary: "Moderate support",
				description:
					"Moderates a support request by changing its status and severity. Only CLOSED or RESOLVED are allowed.",
				params: z.object({ id: z.string() }),
				body: moderateSupportBodySchema,
				response: {
					200: z.object({ support: supportSchema }),
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const result = await moderateSupportUseCase.execute({
				supportId: request.params.id,
				...request.body,
				moderatedBy: request.authV2User!.id,
			});
			return reply.send({ support: result.support });
		},
	);
}
