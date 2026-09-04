import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { auth } from "@/modules/auth/providers/auth/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "@/modules/auth/providers/auth/better-auth/better-auth-auth-provider.js";
import { AppError, appErrorSchema } from "@/modules/common/errors/app-error.js";
import { createVerifySession } from "@/modules/common/middlewares/verify-session.js";
import { withBearerAuth } from "@/modules/common/types/openapi-security.js";
import {
	createDenunciationSchema,
	denunciationSchema,
	getOwnQuerySchema,
	paginatedDenunciationsSchema,
	updateOwnDenunciationBodySchema,
} from "./dtos/denunciations-dto.js";
import { PrismaDenunciationsRepository } from "./repositories/prisma/denunciations-repository-prisma.js";
import { CancelOwnDenunciationUseCase } from "./use-cases/cancel-own-denunciation-use-case.js";
import { CreateDenunciationUseCase } from "./use-cases/create-denunciation-use-case.js";
import { GetOwnDenunciationUseCase } from "./use-cases/get-own-denunciation-use-case.js";
import { GetOwnDenunciationsUseCase } from "./use-cases/get-own-denunciations-use-case.js";
import { UpdateOwnDenunciationUseCase } from "./use-cases/update-own-denunciation-use-case.js";

const DENUNCIATIONS_TAG = "Denunciations";

function buildHeaders(request: FastifyRequest): Headers {
	return new Headers(request.headers as Record<string, string>);
}

export async function denunciationRoutes(app: FastifyInstance): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const authProvider = makeBetterAuthAuthProvider(auth);
	const verifySession = createVerifySession(authProvider);
	const denunciationsRepository = new PrismaDenunciationsRepository();

	const createDenunciationUseCase = new CreateDenunciationUseCase(
		denunciationsRepository,
	);
	const getOwnDenunciationsUseCase = new GetOwnDenunciationsUseCase(
		denunciationsRepository,
	);
	const getOwnDenunciationUseCase = new GetOwnDenunciationUseCase(
		denunciationsRepository,
	);
	const updateOwnDenunciationUseCase = new UpdateOwnDenunciationUseCase(
		denunciationsRepository,
	);
	const cancelOwnDenunciationUseCase = new CancelOwnDenunciationUseCase(
		denunciationsRepository,
	);

	typedApp.post(
		"/denunciations",
		{
			config: { public: true },
			schema: {
				tags: [DENUNCIATIONS_TAG],
				summary: "Submit a denunciation",
				description:
					"Receives a denunciation (title, description, location, reported user). Authentication is optional — when authenticated, reporter_user_id and reporter_email are extracted from the session.",
				body: createDenunciationSchema,
				response: {
					200: z.object({ denunciation: denunciationSchema }),
					400: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const parsed = createDenunciationSchema.safeParse(request.body);
			if (!parsed.success) {
				throw new AppError(
					parsed.error.issues[0]?.message ?? "Invalid payload",
					"DENUNCIATION_INVALID_BODY",
					400,
				);
			}

			if (!parsed.data.reporter_email) {
				throw new AppError(
					"reporter_email is required",
					"DENUNCIATION_EMAIL_REQUIRED",
					400,
				);
			}

			let userId: string | null = null;
			let sessionEmail: string | null = null;

			try {
				const headers = buildHeaders(request);
				const result = await authProvider.getSession(headers);
				if (result) {
					userId = result.user.id;
					sessionEmail = result.user.email;
				}
			} catch {
				// session not required for creation
			}

			const denunciation = await createDenunciationUseCase.execute({
				...parsed.data,
				reporter_email: sessionEmail ?? parsed.data.reporter_email,
				reporter_user_id: userId,
			});

			return reply.send({ denunciation });
		},
	);

	typedApp.get(
		"/denunciations",
		{
			preHandler: [verifySession],
			schema: withBearerAuth({
				tags: [DENUNCIATIONS_TAG],
				summary: "List my denunciations",
				description:
					"Returns the denunciations created by the authenticated user.",
				querystring: getOwnQuerySchema,
				response: {
					200: paginatedDenunciationsSchema,
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = request.authV2User!;
			const { cursor, limit } = request.query;

			const result = await getOwnDenunciationsUseCase.execute({
				userId: user.id,
				cursor: cursor ? new Date(cursor) : undefined,
				limit,
			});

			return reply.send({
				denunciations: result.denunciations,
				nextCursor: result.nextCursor?.toISOString() ?? null,
			});
		},
	);

	typedApp.get(
		"/denunciations/:id",
		{
			preHandler: [verifySession],
			schema: withBearerAuth({
				tags: [DENUNCIATIONS_TAG],
				summary: "Get my denunciation",
				description:
					"Returns a single denunciation owned by the authenticated user.",
				params: z.object({ id: z.string() }),
				response: {
					200: z.object({ denunciation: denunciationSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = request.authV2User!;

			const denunciation = await getOwnDenunciationUseCase.execute({
				userId: user.id,
				denunciationId: request.params.id,
			});

			return reply.send({ denunciation });
		},
	);

	typedApp.patch(
		"/denunciations/:id",
		{
			preHandler: [verifySession],
			schema: withBearerAuth({
				tags: [DENUNCIATIONS_TAG],
				summary: "Update my denunciation",
				description:
					"Updates title or description of a denunciation while its status is OPEN.",
				params: z.object({ id: z.string() }),
				body: updateOwnDenunciationBodySchema,
				response: {
					200: z.object({ denunciation: denunciationSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = request.authV2User!;

			const denunciation = await updateOwnDenunciationUseCase.execute({
				userId: user.id,
				denunciationId: request.params.id,
				...request.body,
			});

			return reply.send({ denunciation });
		},
	);

	typedApp.post(
		"/denunciations/:id/cancel",
		{
			preHandler: [verifySession],
			schema: withBearerAuth({
				tags: [DENUNCIATIONS_TAG],
				summary: "Cancel my denunciation",
				description: "Cancels a denunciation while its status is OPEN.",
				params: z.object({ id: z.string() }),
				response: {
					200: z.object({ denunciation: denunciationSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = request.authV2User!;

			const denunciation = await cancelOwnDenunciationUseCase.execute({
				userId: user.id,
				denunciationId: request.params.id,
			});

			return reply.send({ denunciation });
		},
	);
}
