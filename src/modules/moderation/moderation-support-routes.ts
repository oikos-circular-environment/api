import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { makeStorageProvider } from "@/modules/common/providers/storage/make-storage-provider.js";
import { AppError, appErrorSchema } from "../common/errors/app-error.js";
import {
	createSupportBodySchema,
	supportSchema,
} from "./dtos/moderation-dto.js";
import { PrismaSupportsRepository } from "./repositories/prisma/supports-repository-prisma.js";
import {
	CreateSupportUseCase,
	MAX_SUPPORT_FILES,
	SUPPORT_ATTACHMENT_MAX_SIZE_IN_BYTES,
} from "./use-cases/create-support-use-case.js";

const MODERATION_TAG = "Moderation";
const MODERATION_SUPPORT_TAG = "Moderation / Support";

export async function moderationSupportRoutes(
	app: FastifyInstance,
): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const supportsRepository = new PrismaSupportsRepository();
	const storageProvider = makeStorageProvider();

	const createSupportUseCase = new CreateSupportUseCase(
		supportsRepository,
		storageProvider,
	);

	typedApp.post(
		"/moderation/support",
		{
			config: { public: true },
			schema: {
				tags: [MODERATION_TAG, MODERATION_SUPPORT_TAG],
				summary: "Submit a support request",
				description:
					"Receives a support submission from the Suporte form (title, description, type, environment and up to 5 images, 10MB each). Does not require authentication.",
				consumes: ["multipart/form-data"],
				response: {
					200: z.object({ support: supportSchema }),
					400: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const fields: Record<string, string> = {};
			const files: Array<{
				fileName: string;
				mimeType: string;
				content: Buffer;
			}> = [];

			try {
				const parts = request.parts({
					limits: {
						files: MAX_SUPPORT_FILES,
						fileSize: SUPPORT_ATTACHMENT_MAX_SIZE_IN_BYTES,
						fields: 10,
					},
				});

				for await (const part of parts) {
					if (part.type === "file") {
						files.push({
							fileName: part.filename,
							mimeType: part.mimetype,
							content: await part.toBuffer(),
						});
					} else {
						fields[part.fieldname] = String(part.value);
					}
				}
			} catch (error) {
				const { FilesLimitError, RequestFileTooLargeError } =
					app.multipartErrors;

				if (error instanceof FilesLimitError) {
					throw new AppError(
						`Support accepts at most ${MAX_SUPPORT_FILES} images`,
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

			let environment: unknown;
			if (fields.environment !== undefined) {
				try {
					environment = JSON.parse(fields.environment);
				} catch {
					throw new AppError(
						"environment must be valid JSON",
						"SUPPORT_INVALID_BODY",
						400,
					);
				}
			}

			const parsed = createSupportBodySchema.safeParse({
				...fields,
				environment,
			});
			if (!parsed.success) {
				throw new AppError(
					parsed.error.issues[0]?.message ?? "Invalid payload",
					"SUPPORT_INVALID_BODY",
					400,
				);
			}

			if (!parsed.data.reporter_email) {
				throw new AppError(
					"reporter_email is required",
					"SUPPORT_EMAIL_REQUIRED",
					400,
				);
			}

			const support = await createSupportUseCase.execute({
				...parsed.data,
				reporter_email: parsed.data.reporter_email,
				files,
			});

			return reply.send({ support });
		},
	);
}
