import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { auth } from "@/modules/auth/providers/auth/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "@/modules/auth/providers/auth/better-auth/better-auth-auth-provider.js";
import { appErrorSchema } from "@/modules/common/errors/app-error.js";
import { requireRole } from "@/modules/common/middlewares/require-role.js";
import {
	createVerifySession,
	requireAuthUser,
} from "@/modules/common/middlewares/verify-session.js";
import { withBearerAuth } from "@/modules/common/types/openapi-security.js";
import { denunciationSchema } from "@/modules/denunciation/dtos/denunciations-dto.js";
import { BanUserUseCase } from "../users/use-cases/ban-user-use-case.js";
import { RevokeUserSessionsUseCase } from "../users/use-cases/revoke-user-sessions-use-case.js";
import {
	getDenunciationsQuerySchema,
	moderateDenunciationBodySchema,
} from "./dtos/moderation-denunciation-dto.js";
import { PrismaModerationDenunciationsRepository } from "./repositories/prisma/moderation-denunciations-repository-prisma.js";
import { GetDenunciationUseCase } from "./use-cases/get-denunciation-use-case.js";
import { GetDenunciationsUseCase } from "./use-cases/get-denunciations-use-case.js";
import { ModerateDenunciationBanUseCase } from "./use-cases/moderate-denunciation-ban-use-case.js";
import { ModerateDenunciationUseCase } from "./use-cases/moderate-denunciation-use-case.js";

const MODERATION_DENUNCIATIONS_TAG = "Moderation / Denunciations";

export async function moderationDenunciationsRoutes(
	app: FastifyInstance,
): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const authProvider = makeBetterAuthAuthProvider(auth);
	const verifySession = createVerifySession(authProvider);
	const requireModerator = requireRole("moderator");
	const denunciationsRepository = new PrismaModerationDenunciationsRepository();

	const getDenunciationsUseCase = new GetDenunciationsUseCase(
		denunciationsRepository,
	);
	const getDenunciationUseCase = new GetDenunciationUseCase(
		denunciationsRepository,
	);
	const moderateDenunciationUseCase = new ModerateDenunciationUseCase(
		denunciationsRepository,
	);
	const banUserUseCase = new BanUserUseCase(authProvider);
	const revokeUserSessionsUseCase = new RevokeUserSessionsUseCase(authProvider);
	const moderateDenunciationBanUseCase = new ModerateDenunciationBanUseCase(
		denunciationsRepository,
		banUserUseCase,
		revokeUserSessionsUseCase,
	);

	typedApp.get(
		"/moderation/denunciations",
		{
			preHandler: [verifySession, requireModerator],
			schema: withBearerAuth({
				tags: [MODERATION_DENUNCIATIONS_TAG],
				summary: "List denunciations",
				description:
					"Lists all denunciations with optional filters (status, severity) and cursor-based pagination.",
				querystring: getDenunciationsQuerySchema,
				response: {
					200: z.object({ denunciations: z.array(denunciationSchema) }),
					401: appErrorSchema,
					403: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const result = await getDenunciationsUseCase.execute(request.query);
			return reply.send({ denunciations: result.denunciations });
		},
	);

	typedApp.get(
		"/moderation/denunciations/:id",
		{
			preHandler: [verifySession, requireModerator],
			schema: withBearerAuth({
				tags: [MODERATION_DENUNCIATIONS_TAG],
				summary: "Get denunciation by id",
				params: z.object({ id: z.string() }),
				response: {
					200: z.object({ denunciation: denunciationSchema }),
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const result = await getDenunciationUseCase.execute({
				denunciationId: request.params.id,
			});
			return reply.send({ denunciation: result.denunciation });
		},
	);

	typedApp.patch(
		"/moderation/denunciations/:id",
		{
			preHandler: [verifySession, requireModerator],
			schema: withBearerAuth({
				tags: [MODERATION_DENUNCIATIONS_TAG],
				summary: "Moderate denunciation",
				description:
					"Moderates a denunciation by changing its status and severity. Only CLOSED or RESOLVED are allowed.",
				params: z.object({ id: z.string() }),
				body: moderateDenunciationBodySchema,
				response: {
					200: z.object({ denunciation: denunciationSchema }),
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const result = await moderateDenunciationUseCase.execute({
				denunciationId: request.params.id,
				...request.body,
				moderatedBy: requireAuthUser(request).id,
			});
			return reply.send({ denunciation: result.denunciation });
		},
	);

	typedApp.post(
		"/moderation/denunciations/:id/ban",
		{
			preHandler: [verifySession, requireModerator],
			schema: withBearerAuth({
				tags: [MODERATION_DENUNCIATIONS_TAG],
				summary: "Ban user from denunciation",
				description:
					"Bans the reported user of a denunciation, revokes their sessions, and marks the denunciation as RESOLVED.",
				params: z.object({ id: z.string() }),
				body: z.object({
					ban_reason: z.string().min(1),
					ban_expires_in: z.number().int().positive().optional(),
				}),
				response: {
					200: z.object({
						denunciation: denunciationSchema,
						user: z.object({
							id: z.string(),
							banned: z.boolean(),
						}),
					}),
					401: appErrorSchema,
					403: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const result = await moderateDenunciationBanUseCase.execute({
				denunciationId: request.params.id,
				moderatorId: requireAuthUser(request).id,
				banReason: request.body.ban_reason,
				banExpiresIn: request.body.ban_expires_in,
				headers: request.headers as unknown as Headers,
			});
			return reply.send({
				denunciation: result.denunciation,
				user: result.user,
			});
		},
	);
}
