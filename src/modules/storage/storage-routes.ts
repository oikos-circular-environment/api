import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { FastifyInstance } from "fastify";
import z from "zod";
import { getMinioConfig } from "@/env/index.js";
import { AppError, appErrorSchema } from "../common/errors/app-error.js";

const minio = getMinioConfig();
const client = new S3Client({
	endpoint: `http://${minio.endpoint}:${minio.port}`,
	region: "us-east-1",
	credentials: {
		accessKeyId: minio.accessKey,
		secretAccessKey: minio.secretKey,
	},
	forcePathStyle: true,
});

export async function storageRoutes(app: FastifyInstance) {
	app.get(
		"/storage/*",
		{
			schema: {
				tags: ["Storage"],
				summary: "Serve stored file",
				description:
					"Streams an object from the MinIO bucket. Public route, no auth required.",
				security: [],
				params: z.object({ "*": z.string() }),
				response: {
					404: appErrorSchema,
				},
			},
		},
		async (request, reply) => {
			const filePath = (request.params as { "*": string })["*"];
			const notFound = new AppError(
				"File not found",
				"STORAGE_FILE_NOT_FOUND",
				404,
			).toResponse();

			try {
				const response = await client.send(
					new GetObjectCommand({
						Bucket: minio.bucket,
						Key: filePath,
					}),
				);

				if (!response.Body) {
					return reply.status(404).send(notFound);
				}

				if (response.ContentType) {
					reply.header("Content-Type", response.ContentType);
				}

				if (response.ContentLength) {
					reply.header("Content-Length", response.ContentLength);
				}

				const bytes = await response.Body.transformToByteArray();
				return reply.send(Buffer.from(bytes));
			} catch {
				return reply.status(404).send(notFound);
			}
		},
	);
}
