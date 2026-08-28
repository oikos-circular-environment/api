import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { makeStorageProvider } from "@/modules/common/providers/storage/make-storage-provider.js";
import { AppError, appErrorSchema } from "../common/errors/app-error.js";
import { createSupportRequestBodySchema } from "./dtos/moderation-dto.js";
import { supportRequestSchema } from "./entities/support-request-entity.js";
import { PrismaSupportRequestsRepository } from "./repositories/prisma/support-requests-repository-prisma.js";
import {
	CreateSupportRequestUseCase,
	MAX_SUPPORT_REQUEST_FILES,
	SUPPORT_REQUEST_ATTACHMENT_MAX_SIZE_IN_BYTES,
} from "./use-cases/create-support-request-use-case.js";

const MODERATION_TAG = "Moderation";
const MODERATION_SUPPORT_TAG = "Moderation / Support";

export async function moderationSupportRoutes(
	app: FastifyInstance,
): Promise<void> {
	const typedApp = app.withTypeProvider<ZodTypeProvider>();
	const supportRequestsRepository = new PrismaSupportRequestsRepository();
	const storageProvider = makeStorageProvider();

	const createSupportRequestUseCase = new CreateSupportRequestUseCase(
		supportRequestsRepository,
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
					"Receives a support request submission from the Suporte form (title, description and up to 5 images, 10MB each). Does not require authentication.",
				consumes: ["multipart/form-data"],
				response: {
					200: z.object({ supportRequest: supportRequestSchema }),
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
						files: MAX_SUPPORT_REQUEST_FILES,
						fileSize: SUPPORT_REQUEST_ATTACHMENT_MAX_SIZE_IN_BYTES,
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
						`Support request accepts at most ${MAX_SUPPORT_REQUEST_FILES} images`,
						"SUPPORT_REQUEST_TOO_MANY_FILES",
						400,
					);
				}

				if (error instanceof RequestFileTooLargeError) {
					throw new AppError(
						"Support request attachment exceeds the maximum size of 10MB",
						"SUPPORT_REQUEST_ATTACHMENT_TOO_LARGE",
						400,
					);
				}

				throw error;
			}

			const parsed = createSupportRequestBodySchema.safeParse(fields);
			if (!parsed.success) {
				throw new AppError(
					parsed.error.issues[0]?.message ?? "Invalid payload",
					"SUPPORT_REQUEST_INVALID_BODY",
					400,
				);
			}

			const supportRequest = await createSupportRequestUseCase.execute({
				...parsed.data,
				files,
			});

			return reply.send({ supportRequest });
		},
	);
}
