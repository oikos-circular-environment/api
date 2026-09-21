import type { FastifyInstance, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { auth } from "@/modules/auth/providers/auth/better-auth/better-auth.js";
import { makeBetterAuthAuthProvider } from "@/modules/auth/providers/auth/better-auth/better-auth-auth-provider.js";
import { AppError, appErrorSchema } from "@/modules/common/errors/app-error.js";
import {
	createVerifySession,
	requireAuthUser,
} from "@/modules/common/middlewares/verify-session.js";
import { makeStorageProvider } from "@/modules/common/providers/storage/make-storage-provider.js";
import { withBearerAuth } from "@/modules/common/types/openapi-security.js";
import {
	createSupportBodySchema,
	getOwnQuerySchema,
	paginatedSupportsSchema,
	supportSchema,
	updateOwnSupportBodySchema,
} from "./dtos/support-dto.js";
import { PrismaSupportsRepository } from "./repositories/prisma/supports-repository-prisma.js";
import { CancelOwnSupportUseCase } from "./use-cases/cancel-own-support-use-case.js";
import {
	CreateSupportAttachmentUseCase,
	MAX_SUPPORT_ATTACHMENT_FILES,
	SUPPORT_ATTACHMENT_MAX_SIZE_IN_BYTES,
} from "./use-cases/create-support-attachment-use-case.js";
import { CreateSupportUseCase } from "./use-cases/create-support-use-case.js";
import { GetOwnSupportUseCase } from "./use-cases/get-own-support-use-case.js";
import { GetOwnSupportsUseCase } from "./use-cases/get-own-supports-use-case.js";
import { UpdateOwnSupportUseCase } from "./use-cases/update-own-support-use-case.js";

const SUPPORT_TAG = "Support";

function buildHeaders(request: FastifyRequest): Headers {
	return new Headers(request.headers as Record<string, string>);
}

export async function supportRoutes(app: FastifyInstance): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const authProvider = makeBetterAuthAuthProvider(auth);
	const verifySession = createVerifySession(authProvider);
	const supportsRepository = new PrismaSupportsRepository();
	const storageProvider = makeStorageProvider();

	const createSupportUseCase = new CreateSupportUseCase(supportsRepository);
	const createSupportAttachmentUseCase = new CreateSupportAttachmentUseCase(
		supportsRepository,
		storageProvider,
	);
	const getOwnSupportsUseCase = new GetOwnSupportsUseCase(supportsRepository);
	const getOwnSupportUseCase = new GetOwnSupportUseCase(supportsRepository);
	const updateOwnSupportUseCase = new UpdateOwnSupportUseCase(
		supportsRepository,
	);
	const cancelOwnSupportUseCase = new CancelOwnSupportUseCase(
		supportsRepository,
	);

	typedApp.post(
		"/support",
		{
			config: { public: true },
			schema: {
				tags: [SUPPORT_TAG],
				summary: "Submit a support request",
				description:
					"Receives a support submission (title, description, type and environment). Authentication is optional — when authenticated, the user_id and reporter_email are extracted from the session. Use POST /support/:id/attachments to attach images afterwards.",
				body: createSupportBodySchema,
				response: {
					200: z.object({ support: supportSchema }),
					400: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			if (!request.body.reporter_email) {
				throw new AppError(
					"reporter_email is required",
					"SUPPORT_EMAIL_REQUIRED",
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

			const support = await createSupportUseCase.execute({
				...request.body,
				reporter_email: sessionEmail ?? request.body.reporter_email,
				user_id: userId,
			});

			return reply.send({ support });
		},
	);

	typedApp.post(
		"/support/:id/attachments",
		{
			config: { public: true },
			schema: {
				tags: [SUPPORT_TAG],
				summary: "Upload support attachment",
				description:
					"Uploads and attaches an image to an existing support request. Send one file per request. No authentication required.",
				consumes: ["multipart/form-data"],
				params: z.object({ id: z.string() }),
				response: {
					200: z.object({ support: supportSchema }),
					400: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
					500: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const files: Array<{
				fileName: string;
				mimeType: string;
				content: Buffer;
			}> = [];

			try {
				const parts = request.parts({
					limits: {
						files: MAX_SUPPORT_ATTACHMENT_FILES,
						fileSize: SUPPORT_ATTACHMENT_MAX_SIZE_IN_BYTES,
						fields: 0,
					},
				});

				for await (const part of parts) {
					if (part.type === "file") {
						files.push({
							fileName: part.filename,
							mimeType: part.mimetype,
							content: await part.toBuffer(),
						});
					}
				}
			} catch (error) {
				const { FilesLimitError, RequestFileTooLargeError } =
					app.multipartErrors;

				if (error instanceof FilesLimitError) {
					throw new AppError(
						`Support attachment accepts at most ${MAX_SUPPORT_ATTACHMENT_FILES} file`,
						"SUPPORT_TOO_MANY_FILES",
						400,
					);
				}

				if (error instanceof RequestFileTooLargeError) {
					throw new AppError(
						"Support attachment exceeds the maximum size of 10MB",
						"SUPPORT_ATTACHMENT_TOO_LARGE",
						400,
					);
				}

				throw error;
			}

			const file = files[0];

			if (!file) {
				throw new AppError(
					"Support attachment file is required",
					"SUPPORT_ATTACHMENT_FILE_REQUIRED",
					400,
				);
			}

			const support = await createSupportAttachmentUseCase.execute({
				supportId: request.params.id,
				file,
			});

			return reply.send({ support });
		},
	);

	typedApp.get(
		"/support",
		{
			preHandler: [verifySession],
			schema: withBearerAuth({
				tags: [SUPPORT_TAG],
				summary: "List my support requests",
				description:
					"Returns the support requests created by the authenticated user.",
				querystring: getOwnQuerySchema,
				response: {
					200: paginatedSupportsSchema,
					401: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = requireAuthUser(request);
			const { cursor, limit } = request.query;

			const result = await getOwnSupportsUseCase.execute({
				userId: user.id,
				cursor: cursor ? new Date(cursor) : undefined,
				limit,
			});

			return reply.send({
				supports: result.supports,
				nextCursor: result.nextCursor?.toISOString() ?? null,
			});
		},
	);

	typedApp.get(
		"/support/:id",
		{
			preHandler: [verifySession],
			schema: withBearerAuth({
				tags: [SUPPORT_TAG],
				summary: "Get my support request",
				description:
					"Returns a single support request owned by the authenticated user.",
				params: z.object({ id: z.string() }),
				response: {
					200: z.object({ support: supportSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = requireAuthUser(request);

			const support = await getOwnSupportUseCase.execute({
				userId: user.id,
				supportId: request.params.id,
			});

			return reply.send({ support });
		},
	);

	typedApp.patch(
		"/support/:id",
		{
			preHandler: [verifySession],
			schema: withBearerAuth({
				tags: [SUPPORT_TAG],
				summary: "Update my support request",
				description:
					"Updates title or description of a support request while its status is OPEN.",
				params: z.object({ id: z.string() }),
				body: updateOwnSupportBodySchema,
				response: {
					200: z.object({ support: supportSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = requireAuthUser(request);

			const support = await updateOwnSupportUseCase.execute({
				userId: user.id,
				supportId: request.params.id,
				...request.body,
			});

			return reply.send({ support });
		},
	);

	typedApp.post(
		"/support/:id/cancel",
		{
			preHandler: [verifySession],
			schema: withBearerAuth({
				tags: [SUPPORT_TAG],
				summary: "Cancel my support request",
				description: "Cancels a support request while its status is OPEN.",
				params: z.object({ id: z.string() }),
				response: {
					200: z.object({ support: supportSchema }),
					401: appErrorSchema,
					404: appErrorSchema,
					422: appErrorSchema,
				},
			}),
		},
		async (request, reply) => {
			const user = requireAuthUser(request);

			const support = await cancelOwnSupportUseCase.execute({
				userId: user.id,
				supportId: request.params.id,
			});

			return reply.send({ support });
		},
	);
}
