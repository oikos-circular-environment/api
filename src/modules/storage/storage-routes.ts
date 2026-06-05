import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { FastifyInstance } from "fastify";
import { env } from "@/env/index.js";

const client = new S3Client({
	endpoint: `http://${env.MINIO_ENDPOINT}:${env.MINIO_PORT}`,
	region: "us-east-1",
	credentials: {
		accessKeyId: env.MINIO_ACCESS_KEY!,
		secretAccessKey: env.MINIO_SECRET_KEY!,
	},
	forcePathStyle: true,
});

export async function storageRoutes(app: FastifyInstance) {
	app.get("/storage/*", async (request, reply) => {
		const filePath = (request.params as { "*": string })["*"];

		try {
			const response = await client.send(
				new GetObjectCommand({
					Bucket: env.MINIO_BUCKET,
					Key: filePath,
				}),
			);

			if (!response.Body) {
				return reply.status(404).send({ message: "File not found" });
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
			return reply.status(404).send({ message: "File not found" });
		}
	});
}
